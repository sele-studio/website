// SELÈ STUDIO — html-validate project config (lead decision, Addendum A13 step 10).
// Picked up automatically by `html-validate --preset recommended <files>`; not deployed (deploy.yml excludes it).
// Every exception below is a pattern the SPEC / Addendum mandates; each one is scoped as narrowly as the rule allows.
export default {
  extends: ['html-validate:recommended'],
  rules: {
    // Per-image data travels as custom properties (SPEC §3.4, §4.13: --ar, --pos, --w, --h, --max-w) and native-width
    // caps (`width:min(100%, Npx)`, Addendum A6.2 materials/swatches, P2 light crops). Any other inline style is an error.
    'no-inline-style': ['error', { allowedProperties: ['display', 'width', '--ar', '--pos', '--w', '--h', '--max-w'] }],
    // `role="list"` on unstyled <ul>/<ol> keeps list semantics in Safari/VoiceOver (Addendum A4.3, A4.4, A6.2).
    'no-redundant-role': ['error', { exclude: ['list'] }],
    // Spec-mandated ARIA patterns: the no-JS menu link that JS upgrades to a button (A4.2), the projects view
    // radiogroup (SPEC §5.2), and the keyboard-scrollable table region (A6.2).
    'prefer-native-element': ['error', { exclude: ['button', 'radio', 'region'] }],
  },
};
