/**
 * Si la app ya está en App Store y Google Play. Mientras Apple y Google no la
 * aprueben, el onboarding y /features/app dicen "Próximamente" en vez de
 * mandar a una tienda. Cuando estén aprobadas, pasa a true (y se repasan los
 * textos que dicen "muy pronto": landing, landingFunciones, featuresApp y
 * featuresEdicion).
 */
export const APP_EN_TIENDAS = false;
