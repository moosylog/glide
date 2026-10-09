# Locale files

GLIDE shows en-US legends out of the box (built in, `core/locale/enUS.js`). Any other locale comes from a locale file in
this folder: drop `locale-<id>[-mac|-win].json` here (for example `locale-de-DE.json`), run `npm run build:locales`
(a workflow does it on push) and a layout whose `"locale"` is `de-DE` shows those legends. No code change.

A layout always stores the key that is pressed (`LS(N4)`); a locale file only says what that press looks like.
