/** "$1,150" — whole dollars unless cents are present. */
export const usd = (n) =>
  `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(Number(n)) ? 0 : 2, maximumFractionDigits: 2 })}`;

/** Lower-case only the first letter: "Replace drywall in 2B" → "replace drywall in 2B". */
export const lowerFirst = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/** "+12105550174" → "(210) 555-0174" for US numbers; anything else unchanged. */
export const formatPhone = (e164) => {
  const m = String(e164 ?? "").match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
};
