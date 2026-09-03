export const VALIDATED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip'
] as const;

export type ValidatedMimeType = (typeof VALIDATED_MIME_TYPES)[number];

type ZipInfo = {
  entries: Set<string>;
};

function startsWithAscii(bytes: Buffer, value: string, offset = 0): boolean {
  if (offset + value.length > bytes.length) return false;
  return Buffer.from(value, 'ascii').equals(bytes.subarray(offset, offset + value.length));
}

function parseZip(bytes: Buffer): ZipInfo | null {
  if (bytes.length < 22 || (!startsWithAscii(bytes, 'PK\x03\x04') && !startsWithAscii(bytes, 'PK\x05\x06'))) {
    return null;
  }

  const searchStart = Math.max(0, bytes.length - 65557);
  let endOfCentralDirectory = -1;
  for (let offset = bytes.length - 22; offset >= searchStart; offset -= 1) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) {
      endOfCentralDirectory = offset;
      break;
    }
  }
  if (endOfCentralDirectory < 0) return null;

  const centralDirectorySize = bytes.readUInt32LE(endOfCentralDirectory + 12);
  const centralDirectoryOffset = bytes.readUInt32LE(endOfCentralDirectory + 16);
  if (
    centralDirectorySize === 0xffffffff ||
    centralDirectoryOffset === 0xffffffff ||
    centralDirectoryOffset + centralDirectorySize > endOfCentralDirectory
  ) {
    return null;
  }

  const entries = new Set<string>();
  let offset = centralDirectoryOffset;
  const end = centralDirectoryOffset + centralDirectorySize;
  while (offset < end) {
    if (offset + 46 > end || bytes.readUInt32LE(offset) !== 0x02014b50) return null;

    const flags = bytes.readUInt16LE(offset + 8);
    const fileNameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const entryEnd = offset + 46 + fileNameLength + extraLength + commentLength;
    if (entryEnd > end) return null;

    // Encrypted archives are not useful for server-side content validation.
    if ((flags & 0x0001) !== 0) return null;
    entries.add(bytes.subarray(offset + 46, offset + 46 + fileNameLength).toString('utf8'));
    offset = entryEnd;
  }

  return offset === end ? { entries } : null;
}

function isPdf(bytes: Buffer): boolean {
  if (!startsWithAscii(bytes, '%PDF-')) return false;
  const version = bytes.subarray(5, 8).toString('ascii');
  if (!/^(?:1\.[0-7]|2\.0)$/.test(version)) return false;
  const tail = bytes.subarray(Math.max(0, bytes.length - 2048)).toString('latin1');
  return tail.includes('%%EOF');
}

/** Detect and validate one of BlockSubmit's supported file formats from bytes. */
export function detectValidatedMimeType(bytes: Buffer): ValidatedMimeType | null {
  if (bytes.length === 0) return null;
  if (isPdf(bytes)) return 'application/pdf';

  const zip = parseZip(bytes);
  if (!zip) return null;
  if (zip.entries.has('[Content_Types].xml') && zip.entries.has('word/document.xml')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (zip.entries.has('[Content_Types].xml') && zip.entries.has('ppt/presentation.xml')) {
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  }
  return 'application/zip';
}
