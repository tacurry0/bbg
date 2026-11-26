(() => {
  'use strict';

  const languages = ['ja', 'zh-TW', 'ko'];
  const catalog = globalThis.NightballMessages;
  const placeholder = /\{(\d+)\}/g;
  const numericUnits = new Set(['球', '本', '勝', '敗', '位', '点', '人', '歳', '年', '回', '塁', '秒', '日', '分', '節', '巡', '戦', '件']);
  const normalize = value => value.replace(/\s+/gu, ' ').trim();
  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function indexPatterns() {
    const byPrefix = new Map();
    const bySuffix = new Map();
    const unanchored = [];
    for (const key of Object.keys(catalog)) {
      const parts = key.split(placeholder);
      if (parts.length === 1) continue;
      const literals = parts.filter((_, i) => i % 2 === 0);
      const fixedText = literals.join('');
      const weight = fixedText.length;
      const [prefix] = literals;
      const suffix = literals.at(-1);
      const numeric = !prefix && literals.length === 2 && numericUnits.has(suffix);
      // A bare particle or punctuation between two fields is not a message.
      if (!numeric && (weight < 2 || !/[\p{L}]/u.test(fixedText))) continue;
      const capture = numeric ? '([0-9]+(?:\\.[0-9]+)?)' : '(.*?)';
      const pattern = {
        key,
        anchor: literals.reduce((longest, part) => part.length > longest.length ? part : longest, ''),
        weight,
        regex: new RegExp('^' + parts.map((part, i) => i % 2 ? capture : escapeRegExp(part)).join('') + '$', 'u'),
        slots: parts.filter((_, i) => i % 2)
      };
      if (!(prefix || suffix)) {
        unanchored.push(pattern);
        continue;
      }
      const index = prefix ? byPrefix : bySuffix;
      const initial = prefix ? prefix[0] : suffix.at(-1);
      if (!index.has(initial)) index.set(initial, []);
      index.get(initial).push(pattern);
    }
    const sort = list => list.sort((a, b) => b.weight - a.weight);
    for (const bucket of [...byPrefix.values(), ...bySuffix.values()]) sort(bucket);
    return {byPrefix, bySuffix, unanchored: sort(unanchored)};
  }

  const attributes = ['aria-label', 'aria-description', 'aria-valuetext', 'alt', 'title', 'placeholder', 'label', 'data-replay-hint'];
  const ignored = 'script, style, template, textarea, [contenteditable]:not([contenteditable="false"]), [data-no-localize]';
  const originals = new WeakMap();
  const originalAttributes = new WeakMap();
  const cache = new Map();
  const prefixSuffix = /^[\s\p{P}\p{S}]+|[\s\p{P}\p{S}]+$/gu;
  let patterns;
  let wordPattern;
  let playerNames;
  let language = 'ja';

  function rosterNames() {
    const clubs = globalThis.NightTeams?.playable;
    if (!playerNames && clubs) {
      playerNames = new Set(clubs.flatMap(club => [...club.batters, ...club.pitchers]).map(player => normalize(player.name)));
      cache.clear();
      wordPattern = undefined;
    }
    return playerNames;
  }

  function lookup(source, depth) {
    const column = language === 'zh-TW' ? 0 : 1;
    const direct = Object.hasOwn(catalog, source) && catalog[source][column];
    if (direct) return direct;

    const segments = source.split(/(\s+[·・|／/]\s+|\s+•\s+)/u);
    const translateSegments = () => segments.map((segment, i) => i % 2 ? segment : translate(segment, depth + 1)).join('');
    if (depth < 6 && segments.length > 1 && segments.some(segment => playerNames?.has(segment))) {
      return translateSegments();
    }

    if (depth < 6) {
      patterns ??= indexPatterns();
      const groups = [patterns.byPrefix.get(source[0]) || [], patterns.bySuffix.get(source.at(-1)) || [], patterns.unanchored];
      let best;
      for (const group of groups) {
        for (const pattern of group) {
          if (best && pattern.weight <= best.pattern.weight) break;
          if (!source.includes(pattern.anchor)) continue;
          const match = pattern.regex.exec(source);
          if (match) {
            best = {pattern, match};
            break;
          }
        }
      }
      if (best) {
        const {pattern, match} = best;
        return catalog[pattern.key][column].replace(placeholder, (token, slot) => {
          const i = pattern.slots.indexOf(slot);
          const value = match[i + 1];
          return value && value !== source ? translate(value, depth + 1) : value ?? token;
        });
      }
    }

    // Labels split by icons, numbers or nested markup often share punctuation.
    const core = source.replace(prefixSuffix, '');
    if (core !== source && Object.hasOwn(catalog, core)) {
      return source.replace(core, catalog[core][column]);
    }
    if (depth < 6) {
      const parts = source.split(/([（(][^()（）]+[）)])/u);
      if (parts.length > 1) {
        return parts.map((part, i) => i % 2
          ? part[0] + translate(part.slice(1, -1), depth + 1) + part.at(-1)
          : translate(part, depth + 1)).join('');
      }
    }
    if (segments.length > 1 && depth < 6) return translateSegments();

    // Baseball terminology also occurs inside messages assembled from runtime
    // values and in older saves that store the original display strings.
    if (!wordPattern) {
      const terms = globalThis.NightballTerms;
      const affectedNames = [...(playerNames || [])].filter(name => terms.some(term => name.includes(term)));
      wordPattern = new RegExp([...affectedNames, ...terms].map(escapeRegExp).join('|'), 'gu');
    }
    return source.replace(wordPattern, term => playerNames?.has(term) ? term : catalog[term][column]);
  }

  function translate(value, depth = 0) {
    if (language === 'ja' || typeof value !== 'string' || value.length > 500 || !/\p{L}/u.test(value)) return value;
    const source = normalize(value);
    if (rosterNames()?.has(source)) return value;
    let translated = cache.get(source);
    if (translated === undefined) {
      translated = lookup(source, depth);
      if (cache.size >= 2048) cache.clear();
      cache.set(source, translated);
    }
    if (translated === source) return value;
    return value.match(/^\s*/u)[0] + translated + value.match(/\s*$/u)[0];
  }

  function localizeText(node) {
    const current = node.data;
    const saved = originals.get(node);
    const source = saved?.rendered === current ? saved.source : current;
    const rendered = translate(source);
    if (rendered !== source) originals.set(node, {source, rendered});
    else originals.delete(node);
    if (rendered !== current) node.data = rendered;
  }

  function localizeAttribute(node, name) {
    const current = node.getAttribute(name);
    let record = originalAttributes.get(node);
    if (current === null) {
      record?.delete(name);
      return;
    }
    const saved = record?.get(name);
    const source = saved?.rendered === current ? saved.source : current;
    const rendered = translate(source);
    if (rendered !== source) {
      if (!record) originalAttributes.set(node, record = new Map());
      record.set(name, {source, rendered});
    } else record?.delete(name);
    if (rendered !== current) node.setAttribute(name, rendered);
  }

  function localizeTree(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      localizeText(node);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || node.matches(ignored)) return;
    for (const name of attributes) localizeAttribute(node, name);
    if (node.matches('meta[name="description"]')) localizeAttribute(node, 'content');
    for (const child of node.childNodes) localizeTree(child);
  }

  const options = {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: attributes};
  const root = document.documentElement;
  const observer = new MutationObserver(records => {
    observer.disconnect();
    for (const {type, target, addedNodes, attributeName} of records) {
      const element = target.nodeType === Node.ELEMENT_NODE ? target : target.parentElement;
      if (!element?.isConnected || element.closest(ignored)) continue;
      if (type === 'attributes') localizeAttribute(target, attributeName);
      else if (type === 'characterData') localizeText(target);
      else for (const node of addedNodes) if (node.parentNode === target) localizeTree(node);
    }
    observer.observe(root, options);
  });

  function setLanguage(value) {
    const next = languages.includes(value) ? value : 'ja';
    if (next === language) return language;
    language = next;
    cache.clear();
    observer.disconnect();
    root.lang = language;
    for (const node of document.querySelectorAll('#abs-word, #abs-gap')) node.lang = language === 'ja' ? 'zh-Hant' : language;
    localizeTree(root);
    if (language !== 'ja') observer.observe(root, options);
    return language;
  }

  globalThis.NightI18n = {setLanguage, text: translate, get language() {return language;}};
  try {
    setLanguage(JSON.parse(localStorage.getItem('nightball.settings') || '{}').language);
  } catch {
    // A missing or invalid save uses the original Japanese UI.
  }
})();
