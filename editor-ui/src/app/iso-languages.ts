const codes = [
  'en', 'es', 'ar', 'fr', 'zh', 'hi', 'pt', 'ru', 'ja', 'de', 'bn', 'ur', 'tr', 'vi', 'ko', 'it', 'th', 'id', 'te', 'mr', 'ta', 'pa', 'gu', 'kn', 'ml', 'am', 'sw', 'ms', 'fa', 'pl', 'uk', 'ro', 'nl', 'el', 'sv', 'sr', 'no', 'cs', 'sk', 'hu', 'bg', 'hr', 'lt', 'lv', 'et', 'sl'
];

export const isoLanguages = codes.map(code => {
  try {
    const enName = new Intl.DisplayNames(['en'], { type: 'language' }).of(code);
    const nativeName = new Intl.DisplayNames([code], { type: 'language' }).of(code);
    return {
      label: enName === nativeName ? enName : `${enName} (${nativeName})`,
      value: code
    };
  } catch (e) {
    return { label: code, value: code };
  }
});
