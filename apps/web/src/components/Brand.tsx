/**
 * The ø mark and the name, for screens where the top bar's wordmark isn't there: Today on a
 * phone (the tab bar sits at the bottom) and onboarding (no tab bar yet). `phoneOnly` hides it
 * from tablet width, where the top bar shows the same mark.
 */
export function Brand({ phoneOnly = false }: { phoneOnly?: boolean }) {
  return (
    <p className={phoneOnly ? 'brand phone-only' : 'brand'}>
      <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={22} height={22} />
      Tjuvstart
    </p>
  );
}
