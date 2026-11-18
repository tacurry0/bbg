from hashlib import sha1, sha256
from pathlib import Path
import struct
import subprocess
from tempfile import TemporaryDirectory
import zipfile
import zlib

FILE = Path(__file__).resolve().parent.parent / 'NIGHTBALL-Online.apk'


def numbers(fmt, data, offset=0):
    return struct.unpack_from('<' + fmt, data, offset)


def number(fmt, data, offset=0):
    return numbers(fmt, data, offset)[0]


def as_u32(value):
    return struct.pack('<I', value)


def unpack_lp(data, offset=0):
    size = number('I', data, offset)
    start = offset + 4
    end = start + size
    assert end <= len(data)
    return data[start:end], end


def single(data):
    part, end = unpack_lp(data)
    assert end == len(data)
    return part


def all_chunks(data, offset=0):
    while offset < len(data):
        kind, header, size = numbers('HHI', data, offset)
        assert 8 <= header <= size <= len(data) - offset
        yield kind, header, data[offset:offset + size]
        offset += size


def utf8_pool(data):
    assert number('I', data, 16) & 0x100
    count, string_start = number('I', data, 8), number('I', data, 20)
    result = []
    for index in range(count):
        at = string_start + number('I', data, 28 + 4 * index)
        at += 2 if data[at] & 128 else 1
        if data[at] & 128:
            length = ((data[at] & 127) << 8) | data[at + 1]
            at += 2
        else:
            length = data[at]
            at += 1
        assert data[at + length] == 0
        result.append(data[at:at + length].decode())
    return result


def verify_manifest(data, resources):
    [(kind, header, xml)] = all_chunks(data)
    assert kind == 3 and header == 8
    strings = []
    tags = {}
    permissions = set()
    for kind, _, item in all_chunks(xml, 8):
        if kind == 1:
            strings = utf8_pool(item)
        elif kind == 0x0102:
            tag = strings[number('I', item, 20)]
            at, size, count = numbers('HHH', item, 24)
            attrs = {}
            for index in range(count):
                start = 16 + at + size * index
                name = strings[number('I', item, start + 4)]
                datatype = item[start + 15]
                value = number('I', item, start + 16)
                attrs[name] = strings[value] if datatype == 3 else value
            if tag == 'uses-permission':
                permissions.add(attrs['name'])
            else:
                tags[tag] = attrs
    assert tags['manifest']['package'] == 'site.nightball.pocket'
    assert tags['manifest']['versionCode'] == 1
    assert tags['uses-sdk'] == {'minSdkVersion': 26, 'targetSdkVersion': 34}
    assert permissions == {'android.permission.INTERNET', 'android.permission.VIBRATE'}
    assert tags['application']['icon'] == 0x7F010000
    assert tags['activity']['name'] == 'site.nightball.pocket.MainActivity'
    assert tags['activity']['exported'] == 0xFFFFFFFF
    assert tags['action']['name'] == 'android.intent.action.MAIN'
    assert tags['category']['name'] == 'android.intent.category.LAUNCHER'
    [(kind, header, table)] = all_chunks(resources)
    assert kind == 2 and number('I', table, 8) == 1
    global_pool, package = list(all_chunks(table, header))
    assert utf8_pool(global_pool[2]) == ['res/drawable/icon.png']
    assert package[0] == 0x200 and number('I', package[2], 8) == 0x7F
    _, _, spec, type_values = list(all_chunks(package[2], package[1]))
    assert spec[0] == 0x202 and type_values[0] == 0x201
    type_data = type_values[2]
    assert type_data[8] == 1 and number('I', type_data, 12) == 1
    entry_offset = number('I', type_data, 16)
    assert numbers('HHI', type_data, entry_offset) == (8, 0, 0)
    assert numbers('HBBI', type_data, entry_offset + 8) == (8, 0, 3, 0)


def verify_dex(data):
    def leb(offset):
        result = 0
        for shift in range(0, 35, 7):
            value = data[offset]
            offset += 1
            result |= (value & 127) << shift
            if value < 128:
                return result, offset
        raise ValueError('DEX ULEB128')

    assert data[:8] == b'dex\n035\0'
    assert number('I', data, 8) == zlib.adler32(data[12:])
    assert data[12:32] == sha1(data[32:]).digest()
    assert numbers('III', data, 32) == (len(data), 112, 0x12345678)
    sc, so, tc, to, pc, po, fc, fo, mc, mo, cc, co = numbers('12I', data, 56)
    strings = []
    for index in range(sc):
        target = number('I', data, so + 4 * index)
        length, start = leb(target)
        string = data[start:data.index(0, start)].decode('utf-8')
        assert len(string) == length
        strings.append(string)
    assert strings == sorted(strings)
    assert 'https://nightball-pocket-261104.tacurry.chatgpt.site/' in strings
    type_ids = numbers(str(tc) + 'I', data, to)
    assert sorted(type_ids) == list(type_ids)
    types = [strings[index] for index in type_ids]
    names = [strings[number('I', data, mo + index * 8 + 4)] for index in range(mc)]
    expected = {
        'Lsite/nightball/pocket/MainActivity;': {'<init>', 'onCreate', 'onPause', 'onResume', 'onBackPressed', 'onActivityResult'},
        'Lsite/nightball/pocket/GameClient;': {'<init>', 'shouldOverrideUrlLoading'},
        'Lsite/nightball/pocket/AudioPicker;': {'<init>', 'onShowFileChooser'},
    }
    assert cc == len(expected)
    simple = {0x12, 0x0A, 0x0C, 0x0E, 0x0F}
    two = {0x13, 0x1A, 0x22, 0x54, 0x5B, 0x33, 0x38}
    three = {0x14, 0x6E, 0x6F, 0x70, 0x71, 0x72}
    for index in range(cc):
        class_type, _, _, _, _, _, at, _ = numbers('8I', data, co + 32 * index)
        counts = []
        for _ in range(4):
            n, at = leb(at)
            counts.append(n)
        for _ in range(sum(counts[:2]) * 2):
            _, at = leb(at)
        code_names = set()
        for count in counts[2:]:
            method_index = 0
            for _ in range(count):
                delta, at = leb(at)
                _, at = leb(at)
                code, at = leb(at)
                method_index += delta
                code_names.add(names[method_index])
                assert code % 4 == 0 and code < len(data) - 16
                registers, inputs, outs, tries, _, insns = numbers('4H2I', data, code)
                assert inputs <= registers and tries == 0
                code_units = numbers(str(insns) + 'H', data, code + 16)
                cursor = 0
                jump_targets = []
                boundaries = set()
                while cursor < insns:
                    boundaries.add(cursor)
                    op = code_units[cursor] & 255
                    if op in (0x33, 0x38):
                        branch = code_units[cursor + 1]
                        jump_targets.append(cursor + (branch if branch < 32768 else branch - 65536))
                    if op in (0x6E, 0x6F, 0x70, 0x71, 0x72):
                        assert code_units[cursor + 1] < mc
                        assert (code_units[cursor] >> 12) <= outs
                    assert op in simple | two | three
                    cursor += 1 if op in simple else 2 if op in two else 3
                assert cursor == insns and set(jump_targets) <= boundaries
        assert code_names == expected[types[class_type]]


def verify_signature(apk):
    eocd = len(apk) - 22
    assert apk[eocd:eocd + 4] == b'PK\x05\x06'
    central = number('I', apk, eocd + 16)
    assert apk[central - 16:central] == b'APK Sig Block 42'
    trailing_size = number('Q', apk, central - 24)
    start = central - trailing_size - 8
    assert number('Q', apk, start) == trailing_size
    pair_size, pair_id = numbers('QI', apk, start + 8)
    assert pair_id == 0x7109871A and start + 16 + pair_size == central - 24
    signer = single(single(apk[start + 20:central - 24]))
    signed, position = unpack_lp(signer)
    signatures, position = unpack_lp(signer, position)
    key, position = unpack_lp(signer, position)
    assert position == len(signer)

    digests, position = unpack_lp(signed)
    certificates, position = unpack_lp(signed, position)
    attributes, position = unpack_lp(signed, position)
    assert position == len(signed) and not attributes
    digest = single(digests)
    signature = single(signatures)
    assert number('I', digest) == number('I', signature) == 0x0103
    eocd_normalized = apk[eocd:eocd + 16] + as_u32(start) + apk[eocd + 20:]
    pieces = [apk[:start], apk[central:eocd], eocd_normalized]
    chunks = []
    for piece in pieces:
        for offset in range(0, len(piece), 1 << 20):
            data = piece[offset:offset + (1 << 20)]
            chunks.append(sha256(bytes([0xA5]) + as_u32(len(data)) + data).digest())
    assert single(digest[4:]) == sha256(bytes([0x5A]) + as_u32(len(chunks)) + b''.join(chunks)).digest()
    with TemporaryDirectory() as directory:
        location = Path(directory)
        public_pem = location / 'public.pem'
        signature_file = location / 'signature.bin'
        public = subprocess.run(['openssl', 'x509', '-inform', 'DER', '-pubkey', '-noout'],
                                input=single(certificates), capture_output=True, check=True).stdout
        public_pem.write_bytes(public)
        built_key = subprocess.run(['openssl', 'pkey', '-pubin', '-outform', 'DER'],
                                   input=public, capture_output=True, check=True).stdout
        assert built_key == key
        signature_file.write_bytes(single(signature[4:]))
        check = subprocess.run(['openssl', 'dgst', '-sha256', '-verify', str(public_pem),
                                '-signature', str(signature_file)], input=signed, capture_output=True, check=True)
        assert check.stdout.strip() == b'Verified OK'


apk = FILE.read_bytes()
with zipfile.ZipFile(FILE) as archive:
    assert archive.testzip() is None
    assert set(archive.namelist()) == {'AndroidManifest.xml', 'classes.dex', 'resources.arsc', 'res/drawable/icon.png'}
    for name in ('resources.arsc', 'res/drawable/icon.png'):
        entry = archive.getinfo(name)
        assert entry.compress_type == zipfile.ZIP_STORED
        name_length, extra_length = numbers('HH', apk, entry.header_offset + 26)
        assert (entry.header_offset + 30 + name_length + extra_length) % 4 == 0
    verify_manifest(archive.read('AndroidManifest.xml'), archive.read('resources.arsc'))
    verify_dex(archive.read('classes.dex'))
verify_signature(apk)
print('Verified APK v2 signature and file integrity, Android manifest, launcher icon, DEX code, and no bundled game assets.')
print(f'{FILE.name}: {len(apk):,} bytes, SHA-256 {sha256(apk).hexdigest()}')
