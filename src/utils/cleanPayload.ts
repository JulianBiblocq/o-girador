
export function cleanPayload<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        result[key] = cleanPayload(val);
      } else if (Array.isArray(val)) {
        result[key] = val.map((item) => (typeof item === 'object' && item !== null ? cleanPayload(item) : item));
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}
