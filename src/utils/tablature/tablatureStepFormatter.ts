export function formatStepsRow(
  steps: (string | number | [string, string])[],
  stepCount: number,
  isHtml: boolean
): string {
  let res = "";
  for (let s = 0; s < stepCount; s++) {
    const val = steps[s];
    let char = '-';
    if (Array.isArray(val)) {
      const v0 = (!val[0] || String(val[0]) === '0') ? '-' : String(val[0]);
      const v1 = (!val[1] || String(val[1]) === '0') ? '-' : String(val[1]);
      char = `${v0}/${v1}`;
    } else if (val !== 0 && val !== '0' && val !== '' && val !== undefined) {
      char = String(val);
    }

    const isShaded = Math.floor(s / 4) % 2 !== 0;
    if (isHtml && s % 4 === 0 && isShaded) res += `<span style="background-color: rgba(0,0,0,0.1); border-radius: 2px;">`;
    res += char;
    if (s < stepCount - 1) res += " ";
    if (isHtml && s % 4 === 3 && isShaded) res += `</span>`;
  }
  if (isHtml && stepCount % 4 !== 0 && Math.floor((stepCount - 1) / 4) % 2 !== 0) {
    res += `</span>`;
  }
  return res;
}
