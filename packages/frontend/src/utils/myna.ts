import { Schema, SchemaParser, TagClass } from "@aokiapp/tlv/parser";
export function parseKojinBango(data: Uint8Array): string {
  let start = 0,
    end = data.length - 1;
  while (start <= end && data[start] === 0xff) start++;
  while (end >= start && data[end] === 0xff) end--;
  data = data.slice(start, end + 1);

  const schekaKenhojoMynumber = Schema.primitive(
    "mynumber",
    {
      tagClass: TagClass.Universal,
      tagNumber: 16,
    },

    (a) => {
      return new TextDecoder().decode(a);
    },
  );
  const parser = new SchemaParser(schekaKenhojoMynumber);
  const parsed = parser.parse(data.buffer as ArrayBuffer);
  return parsed;
}
