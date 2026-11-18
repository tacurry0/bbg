from dataclasses import dataclass
from hashlib import sha1, sha256
from io import BytesIO
from pathlib import Path
import os
import struct
import subprocess
import zipfile
import zlib

ROOT = Path(__file__).resolve().parent
PACKAGE = 'site.nightball.pocket'
ORIGIN = 'https://nightball-pocket-261104.tacurry.chatgpt.site'
APP = 'Lsite/nightball/pocket/MainActivity;'
CLIENT = 'Lsite/nightball/pocket/GameClient;'
CHROME = 'Lsite/nightball/pocket/AudioPicker;'
ACTIVITY = 'Landroid/app/Activity;'
BUNDLE = 'Landroid/os/Bundle;'
CONTEXT = 'Landroid/content/Context;'
INTENT = 'Landroid/content/Intent;'
VIEW = 'Landroid/view/View;'
WEB = 'Landroid/webkit/WebView;'
SETTINGS = 'Landroid/webkit/WebSettings;'
WEB_CLIENT = 'Landroid/webkit/WebViewClient;'
WEB_CHROME = 'Landroid/webkit/WebChromeClient;'
PARAMS = 'Landroid/webkit/WebChromeClient$FileChooserParams;'
CALLBACK = 'Landroid/webkit/ValueCallback;'
URI = 'Landroid/net/Uri;'
STRING = 'Ljava/lang/String;'
OBJECT = 'Ljava/lang/Object;'
CHARSEQ = 'Ljava/lang/CharSequence;'
V, Z, I = 'V', 'Z', 'I'
NO_ID = 0xFFFFFFFF


def u16(*values):
    return struct.pack('<' + 'H' * len(values), *values)


def u32(*values):
    return struct.pack('<' + 'I' * len(values), *values)


def u64(value):
    return struct.pack('<Q', value)


def leb(value):
    encoded = bytearray()
    while value > 0x7F:
        encoded.append((value & 0x7F) | 0x80)
        value >>= 7
    encoded.append(value)
    return encoded


def pad4(data):
    return data + b'\0' * (-len(data) % 4)


def method(owner, name, returns, *params):
    return owner, name, (returns, params)


WEB_FIELD = APP, 'webView', WEB
PICKER_FIELD = APP, 'audioCallback', CALLBACK
OWNER_FIELD = CHROME, 'activity', APP


@dataclass
class Function:
    method: tuple
    flags: int
    registers: int
    code: list


def call(owner, name, returns, params, registers, mode='virtual'):
    return 'invoke', mode, method(owner, name, returns, *params), registers


def ctor(owner, parent, field=None):
    params = (APP,) if field else ()
    code = [call(parent, '<init>', V, (), [0], 'direct')]
    if field:
        code.append(('iput', 1, 0, field))
    code.append(('return-void',))
    return Function(method(owner, '<init>', V, *params), 0x10001, 1 + len(params), code)


def lifecycle(name):
    return Function(method(APP, name, V), 0x04, 2, [
        call(ACTIVITY, name, V, (), [1], 'super'),
        ('iget', 0, 1, WEB_FIELD),
        ('if-eqz', 0, 'end'),
        call(WEB, name, V, (), [0]),
        ('label', 'end'),
        ('return-void',),
    ])


def classes():
    on_create = [
        call(ACTIVITY, 'onCreate', V, (BUNDLE,), [4, 5], 'super'),
        ('new', 0, WEB),
        call(WEB, '<init>', V, (CONTEXT,), [0, 4], 'direct'),
        ('iput', 0, 4, WEB_FIELD),
        ('int', 1, -16184559),
        call(WEB, 'setBackgroundColor', V, (I,), [0, 1]),
        call(WEB, 'getSettings', SETTINGS, (), [0]),
        ('move-object', 1),
        ('small', 2, 1),
        call(SETTINGS, 'setJavaScriptEnabled', V, (Z,), [1, 2]),
        call(SETTINGS, 'setDomStorageEnabled', V, (Z,), [1, 2]),
        call(SETTINGS, 'setUseWideViewPort', V, (Z,), [1, 2]),
        ('small', 2, 0),
        call(SETTINGS, 'setAllowFileAccess', V, (Z,), [1, 2]),
        call(SETTINGS, 'setAllowFileAccessFromFileURLs', V, (Z,), [1, 2]),
        call(SETTINGS, 'setAllowUniversalAccessFromFileURLs', V, (Z,), [1, 2]),
        ('small', 2, 1),
        call(SETTINGS, 'setMixedContentMode', V, (I,), [1, 2]),
        ('new', 2, CLIENT),
        call(CLIENT, '<init>', V, (), [2], 'direct'),
        call(WEB, 'setWebViewClient', V, (WEB_CLIENT,), [0, 2]),
        ('new', 2, CHROME),
        call(CHROME, '<init>', V, (APP,), [2, 4], 'direct'),
        call(WEB, 'setWebChromeClient', V, (WEB_CHROME,), [0, 2]),
        call(ACTIVITY, 'setContentView', V, (VIEW,), [4, 0]),
        ('string', 3, ORIGIN + '/'),
        call(WEB, 'loadUrl', V, (STRING,), [0, 3]),
        ('return-void',),
    ]
    back = [
        ('iget', 0, 2, WEB_FIELD),
        ('if-eqz', 0, 'exit'),
        call(WEB, 'canGoBack', Z, (), [0]),
        ('move-result', 1),
        ('if-eqz', 1, 'exit'),
        call(WEB, 'goBack', V, (), [0]),
        ('return-void',),
        ('label', 'exit'),
        call(ACTIVITY, 'onBackPressed', V, (), [2], 'super'),
        ('return-void',),
    ]
    result = [
        call(ACTIVITY, 'onActivityResult', V, (I, I, INTENT), [4, 5, 6, 7], 'super'),
        ('short', 0, 71),
        ('if-ne', 5, 0, 'done'),
        ('iget', 0, 4, PICKER_FIELD),
        ('if-eqz', 0, 'done'),
        ('small', 1, 0),
        ('iput', 1, 4, PICKER_FIELD),
        ('small', 2, -1),
        ('if-ne', 6, 2, 'deliver'),
        ('if-eqz', 7, 'deliver'),
        call(INTENT, 'getData', URI, (), [7]),
        ('move-object', 2),
        ('if-eqz', 2, 'deliver'),
        call(URI, 'getScheme', STRING, (), [2]),
        ('move-object', 3),
        ('string', 2, 'content'),
        call(STRING, 'equals', Z, (OBJECT,), [2, 3]),
        ('move-result', 3),
        ('if-eqz', 3, 'deliver'),
        call(PARAMS, 'parseResult', '[' + URI, (I, INTENT), [6, 7], 'static'),
        ('move-object', 1),
        ('label', 'deliver'),
        call(CALLBACK, 'onReceiveValue', V, (OBJECT,), [0, 1], 'interface'),
        ('label', 'done'),
        ('return-void',),
    ]
    navigation = [
        ('string', 0, ORIGIN + '/'),
        call(STRING, 'startsWith', Z, (STRING,), [4, 0]),
        ('move-result', 1),
        ('if-eqz', 1, 'block'),
        ('small', 0, 0),
        ('return', 0),
        ('label', 'block'),
        ('small', 0, 1),
        ('return', 0),
    ]
    picker = [
        ('iget', 0, 4, OWNER_FIELD),
        ('iget', 1, 0, PICKER_FIELD),
        ('if-eqz', 1, 'open'),
        ('small', 2, 0),
        call(CALLBACK, 'onReceiveValue', V, (OBJECT,), [1, 2], 'interface'),
        ('label', 'open'),
        ('iput', 6, 0, PICKER_FIELD),
        ('new', 1, INTENT),
        ('string', 2, 'android.intent.action.OPEN_DOCUMENT'),
        call(INTENT, '<init>', V, (STRING,), [1, 2], 'direct'),
        ('string', 2, 'android.intent.category.OPENABLE'),
        call(INTENT, 'addCategory', INTENT, (STRING,), [1, 2]),
        ('string', 2, 'audio/*'),
        call(INTENT, 'setType', INTENT, (STRING,), [1, 2]),
        ('string', 2, '音源ファイルを選ぶ'),
        call(INTENT, 'createChooser', INTENT, (INTENT, CHARSEQ), [1, 2], 'static'),
        ('move-object', 1),
        ('short', 3, 71),
        call(ACTIVITY, 'startActivityForResult', V, (INTENT, I), [0, 1, 3]),
        ('small', 0, 1),
        ('return', 0),
    ]
    return {
        APP: (ACTIVITY, [(WEB_FIELD, 0x02), (PICKER_FIELD, 0)], [
            ctor(APP, ACTIVITY), Function(method(APP, 'onCreate', V, BUNDLE), 4, 6, on_create),
            lifecycle('onResume'), lifecycle('onPause'),
            Function(method(APP, 'onBackPressed', V), 1, 3, back),
            Function(method(APP, 'onActivityResult', V, I, I, INTENT), 4, 8, result),
        ]),
        CLIENT: (WEB_CLIENT, [], [
            ctor(CLIENT, WEB_CLIENT),
            Function(method(CLIENT, 'shouldOverrideUrlLoading', Z, WEB, STRING), 1, 5, navigation),
        ]),
        CHROME: (WEB_CHROME, [(OWNER_FIELD, 0x12)], [
            ctor(CHROME, WEB_CHROME, OWNER_FIELD),
            Function(method(CHROME, 'onShowFileChooser', Z, WEB, CALLBACK, PARAMS), 1, 8, picker),
        ]),
    }


def shorty(proto):
    returns, params = proto
    return ''.join('L' if t.startswith(('L', '[')) else t for t in (returns, *params))


def assemble(function, strings, types, fields, methods):
    output = []
    branches = []
    labels = {}
    outs = 0
    modes = dict(virtual=0x6E, super=0x6F, direct=0x70, static=0x71, interface=0x72)
    for op, *args in function.code:
        if op == 'label':
            labels[args[0]] = len(output)
        elif op == 'invoke':
            mode, ref, registers = args
            count = len(registers)
            assert count <= 5 and all(0 <= r < function.registers <= 16 for r in registers)
            outs = max(outs, count)
            c, d, e, f, g = (*registers, *([0] * (5 - count)))
            output.extend([modes[mode] | (g << 8) | (count << 12), methods[ref], c | (d << 4) | (e << 8) | (f << 12)])
        elif op in ('iget', 'iput'):
            register, owner, field = args
            output.extend([(0x54 if op == 'iget' else 0x5B) | (register << 8) | (owner << 12), fields[field]])
        elif op in ('string', 'new'):
            reg, val = args
            if op == 'string':
                output.extend([0x1A | (reg << 8), strings[val]])
            else:
                output.extend([0x22 | (reg << 8), types[val]])
        elif op in ('move-object', 'move-result', 'return'):
            output.append({'move-object': 0x0C, 'move-result': 0x0A, 'return': 0x0F}[op] | (args[0] << 8))
        elif op == 'return-void':
            output.append(0x0E)
        elif op in ('small', 'short', 'int'):
            reg, val = args
            if op == 'small':
                output.append(0x12 | (reg << 8) | ((val & 15) << 12))
            elif op == 'short':
                output.extend([0x13 | (reg << 8), val & 65535])
            else:
                output.extend([0x14 | (reg << 8), val & 65535, (val >> 16) & 65535])
        elif op in ('if-eqz', 'if-ne'):
            branches.append((len(output), args[-1]))
            insn = (0x38 if op == 'if-eqz' else 0x33 | (args[1] << 12)) | (args[0] << 8)
            output.extend([insn, 0])
        else:
            raise ValueError(op)
    for offset, label in branches:
        output[offset + 1] = (labels[label] - offset) & 65535
    return u16(function.registers, len(function.method[2][1]) + 1, outs, 0) + u32(0, len(output)) + u16(*output)


def make_dex():
    definitions = classes()
    types = set(definitions)
    string_literals = set()
    fields = set()
    methods = set()
    for parent, members, functions in definitions.values():
        types.add(parent)
        fields.update(field for field, _ in members)
        for function in functions:
            methods.add(function.method)
            for insn in function.code:
                if insn[0] == 'invoke':
                    methods.add(insn[2])
                elif insn[0] == 'string':
                    string_literals.add(insn[2])
                elif insn[0] == 'new':
                    types.add(insn[2])
    protos = {m[2] for m in methods}
    for owner, _, proto in methods:
        types.update((owner, proto[0], *proto[1]))
    for owner, _, field_type in fields:
        types.update((owner, field_type))
    strings = sorted(types | string_literals | {shorty(proto) for proto in protos} |
                     {m[1] for m in methods} | {f[1] for f in fields}, key=lambda s: s.encode('utf-16-be'))
    si = {s: i for i, s in enumerate(strings)}
    types = sorted(types, key=si.get)
    ti = {t: i for i, t in enumerate(types)}
    protos = sorted(protos, key=lambda p: (ti[p[0]], tuple(ti[x] for x in p[1])))
    pi = {p: i for i, p in enumerate(protos)}
    fields = sorted(fields, key=lambda f: (ti[f[0]], si[f[1]], ti[f[2]]))
    fi = {f: i for i, f in enumerate(fields)}
    methods = sorted(methods, key=lambda m: (ti[m[0]], si[m[1]], pi[m[2]]))
    mi = {m: i for i, m in enumerate(methods)}
    ordered = sorted(definitions, key=ti.get)
    counts = [len(strings), len(types), len(protos), len(fields), len(methods), len(ordered)]
    sizes = [4, 4, 12, 8, 8, 32]
    offsets = []
    data_offset = 0x70
    for count, size in zip(counts, sizes):
        offsets.append(data_offset)
        data_offset += count * size
    data = bytearray()
    mapping = [(0, 1, 0), *[(i + 1, n, off) for i, (n, off) in enumerate(zip(counts, offsets)) if n]]

    def add_section(code, n, alignment=1):
        data.extend(b'\0' * (-(data_offset + len(data)) % alignment))
        start = data_offset + len(data)
        if n:
            mapping.append((code, n, start))
        return start

    param_lists = sorted({p[1] for p in protos if p[1]})
    add_section(0x1001, len(param_lists), 4)
    params_at = {(): 0}
    for params in param_lists:
        params_at[params] = data_offset + len(data)
        data.extend(pad4(u32(len(params)) + u16(*(ti[t] for t in params))))

    functions = [function for owner in ordered for function in definitions[owner][2]]
    add_section(0x2001, len(functions), 4)
    code_at = {}
    for function in functions:
        code_at[function.method] = data_offset + len(data)
        data.extend(pad4(assemble(function, si, ti, fi, mi)))

    add_section(0x2000, len(ordered))
    class_at = {}
    for owner in ordered:
        _, members, functions = definitions[owner]
        class_at[owner] = data_offset + len(data)
        direct = [f for f in functions if f.method[1] == '<init>']
        virtual = [f for f in functions if f.method[1] != '<init>']
        for count in (0, len(members), len(direct), len(virtual)):
            data.extend(leb(count))
        previous = 0
        for field, flags in sorted(members, key=lambda pair: fi[pair[0]]):
            index = fi[field]
            data.extend(leb(index - previous) + leb(flags))
            previous = index
        for group in (direct, virtual):
            previous = 0
            for function in sorted(group, key=lambda f: mi[f.method]):
                index = mi[function.method]
                data.extend(leb(index - previous) + leb(function.flags) + leb(code_at[function.method]))
                previous = index

    add_section(0x2002, len(strings))
    string_at = []
    for string in strings:
        string_at.append(data_offset + len(data))
        assert '\0' not in string and all(ord(ch) <= 0xFFFF for ch in string)
        data.extend(leb(len(string)) + string.encode('utf-8') + b'\0')

    map_at = add_section(0x1000, 1, 4)
    data.extend(u32(len(mapping)))
    for code, n, offset in mapping:
        data.extend(u16(code, 0) + u32(n, offset))

    ids = bytearray(u32(*string_at) + u32(*(si[t] for t in types)))
    for proto in protos:
        ids.extend(u32(si[shorty(proto)], ti[proto[0]], params_at[proto[1]]))
    for owner, name, field_type in fields:
        ids.extend(u16(ti[owner], ti[field_type]) + u32(si[name]))
    for owner, name, proto in methods:
        ids.extend(u16(ti[owner], pi[proto]) + u32(si[name]))
    for owner in ordered:
        ids.extend(u32(ti[owner], 1, ti[definitions[owner][0]], 0, NO_ID, 0, class_at[owner], 0))
    assert len(ids) + 0x70 == data_offset
    header_suffix = u32(data_offset + len(data), 0x70, 0x12345678, 0, 0, map_at,
                        *(value for pair in zip(counts, offsets) for value in pair), len(data), data_offset)
    body = header_suffix + ids + data
    checked = sha1(body).digest() + body
    return b'dex\n035\0' + u32(zlib.adler32(checked)) + checked


def chunk(kind, header, body):
    return u16(kind, len(header) + 8) + u32(len(header) + len(body) + 8) + header + body


def string_pool(strings):
    offsets = []
    data = bytearray()
    for string in strings:
        offsets.append(len(data))
        encoded = string.encode('utf-8')
        for length in (len(string.encode('utf-16-le')) // 2, len(encoded)):
            if length <= 127:
                data.append(length)
            else:
                data.extend([0x80 | (length >> 8), length & 255])
        data.extend(encoded + b'\0')
    return chunk(1, u32(len(strings), 0, 0x100, 28 + 4 * len(strings), 0), u32(*offsets) + pad4(data))


def binary_manifest():
    android_uri = 'http://schemas.android.com/apk/res/android'
    ids = {
        'theme': 0x01010000, 'label': 0x01010001, 'icon': 0x01010002,
        'name': 0x01010003, 'exported': 0x01010010, 'configChanges': 0x0101001F,
        'minSdkVersion': 0x0101020C, 'versionCode': 0x0101021B, 'versionName': 0x0101021C,
        'targetSdkVersion': 0x01010270, 'allowBackup': 0x01010280,
    }
    reference, string, integer, boolean = 1, 3, 16, 18
    elements = ('manifest', [
        ('package', string, PACKAGE), ('versionCode', integer, 1), ('versionName', string, '1.0.0'),
    ], [
        ('uses-sdk', [('minSdkVersion', integer, 26), ('targetSdkVersion', integer, 34)], []),
        ('uses-permission', [('name', string, 'android.permission.INTERNET')], []),
        ('uses-permission', [('name', string, 'android.permission.VIBRATE')], []),
        ('application', [
            ('theme', reference, 0x01030009), ('label', string, 'NIGHTBALL'),
            ('icon', reference, 0x7F010000), ('allowBackup', boolean, 0),
        ], [
            ('activity', [
                ('name', string, PACKAGE + '.MainActivity'),
                ('exported', boolean, NO_ID), ('configChanges', integer, 0x0DA0),
            ], [
                ('intent-filter', [], [
                    ('action', [('name', string, 'android.intent.action.MAIN')], []),
                    ('category', [('name', string, 'android.intent.category.LAUNCHER')], []),
                ]),
            ]),
        ]),
    ])
    strings = list(ids)

    def remember(value):
        if value not in strings:
            strings.append(value)

    def collect(tree):
        tag, attrs, children = tree
        remember(tag)
        for key, kind, val in attrs:
            remember(key)
            if kind == string:
                remember(val)
        for child in children:
            collect(child)

    remember('android')
    remember(android_uri)
    collect(elements)
    index = {s: i for i, s in enumerate(strings)}
    ns = index[android_uri]
    node = u32(1, NO_ID)
    ns_data = u32(index['android'], ns)

    def encode(tree):
        tag, attrs, children = tree
        name = u32(NO_ID, index[tag])
        attrs = sorted(attrs, key=lambda attr: ids.get(attr[0], 0))
        typed = bytearray()
        for key, kind, val in attrs:
            raw = index[val] if kind == string else NO_ID
            typed.extend(u32(ns if key in ids else NO_ID, index[key], raw) +
                         u16(8) + bytes((0, kind)) + u32(raw if kind == string else val))
        start = name + u16(20, 20, len(attrs), 0, 0, 0) + typed
        return (chunk(0x0102, node, start) + b''.join(map(encode, children)) +
                chunk(0x0103, node, name))

    data = (string_pool(strings) + chunk(0x0180, b'', u32(*ids.values())) +
            chunk(0x0100, node, ns_data) + encode(elements) + chunk(0x0101, node, ns_data))
    return chunk(3, b'', data)


def resource_table():
    path = 'res/drawable/icon.png'
    type_names = string_pool(['drawable'])
    key_names = string_pool(['icon'])
    config = u32(64) + bytes(60)
    type_spec = chunk(0x0202, bytes((1, 0, 0, 0)) + u32(1), u32(0))
    type_header_size = 20 + len(config)
    entry = u16(8, 0) + u32(0) + u16(8) + bytes((0, 3)) + u32(0)
    type_data = chunk(0x0201, bytes((1, 0, 0, 0)) + u32(1, type_header_size + 4) + config,
                      u32(0) + entry)
    package_name = PACKAGE.encode('utf-16-le').ljust(256, b'\0')
    package_head = u32(0x7F) + package_name + u32(288, 1, 288 + len(type_names), 1, 0)
    package = chunk(0x0200, package_head, type_names + key_names + type_spec + type_data)
    return chunk(0x0002, u32(1), string_pool([path]) + package)


def openssl(*args, data=None):
    return subprocess.run(['openssl', *map(str, args)], input=data, capture_output=True, check=True).stdout


def signing_credentials():
    directory = ROOT / 'signing'
    directory.mkdir(mode=0o700, exist_ok=True)
    key = directory / 'nightball.pem'
    cert = directory / 'nightball.der'
    if not key.exists() and not cert.exists():
        previous = os.umask(0o077)
        try:
            openssl('req', '-x509', '-newkey', 'rsa:3072', '-nodes', '-keyout', key,
                    '-outform', 'DER', '-out', cert, '-days', '9125', '-subj', '/CN=NIGHTBALL Android')
        finally:
            os.umask(previous)
    return key, cert


def digest_sections(*sections):
    hashes = []
    for section in sections:
        for offset in range(0, len(section), 1024 * 1024):
            piece = section[offset:offset + 1024 * 1024]
            hashes.append(sha256(b'\xa5' + u32(len(piece)) + piece).digest())
    return sha256(b'\x5a' + u32(len(hashes)) + b''.join(hashes)).digest()


def lp(data):
    return u32(len(data)) + data


def sign_apk(unsigned, key, cert):
    end_offset = len(unsigned) - 22
    assert unsigned[end_offset:end_offset + 4] == b'PK\x05\x06'
    central_offset, = struct.unpack_from('<I', unsigned, end_offset + 16)
    payload, central, footer = unsigned[:central_offset], unsigned[central_offset:end_offset], unsigned[end_offset:]
    digest = digest_sections(payload, central, footer)
    algorithm = u32(0x0103)
    signed_data = lp(lp(algorithm + lp(digest))) + lp(lp(cert.read_bytes())) + lp(b'')
    signature = openssl('dgst', '-sha256', '-sign', key, data=signed_data)
    public_key = openssl('pkey', '-in', key, '-pubout', '-outform', 'DER')
    signer = lp(signed_data) + lp(lp(algorithm + lp(signature))) + lp(public_key)
    pair = u32(0x7109871A) + lp(lp(signer))
    pairs = u64(len(pair)) + pair
    size = u64(len(pairs) + 24)
    block = size + pairs + size + b'APK Sig Block 42'
    new_footer = footer[:16] + u32(central_offset + len(block)) + footer[20:]
    return payload + block + central + new_footer


def build():
    raw = BytesIO()
    with zipfile.ZipFile(raw, 'w') as archive:
        entries = {
            'AndroidManifest.xml': (binary_manifest(), zipfile.ZIP_DEFLATED),
            'classes.dex': (make_dex(), zipfile.ZIP_DEFLATED),
            'resources.arsc': (resource_table(), zipfile.ZIP_STORED),
            'res/drawable/icon.png': (
                (ROOT.parent / 'nightball/.sites-checkout/dist/icon-192.png').read_bytes(),
                zipfile.ZIP_STORED,
            ),
        }
        for name, (data, method) in entries.items():
            position = raw.tell() + 30 + len(name)
            entry = zipfile.ZipInfo(name)
            entry.compress_type = method
            if method == zipfile.ZIP_STORED and position % 4:
                padding = (-(position + 4)) % 4
                entry.extra = u16(0xD935, padding) + bytes(padding)
            archive.writestr(entry, data)
    key, cert = signing_credentials()
    output = ROOT.parent / 'NIGHTBALL-Online.apk'
    output.write_bytes(sign_apk(raw.getvalue(), key, cert))
    print(output)


if __name__ == '__main__':
    build()
