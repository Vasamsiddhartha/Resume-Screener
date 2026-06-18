// Type declaration for mammoth's browser build (no bundled types for this subpath).
declare module 'mammoth/mammoth.browser' {
  interface MammothInput {
    arrayBuffer: ArrayBuffer
  }
  interface MammothResult {
    value: string
    messages: unknown[]
  }
  const mammoth: {
    extractRawText(input: MammothInput): Promise<MammothResult>
    convertToHtml(input: MammothInput): Promise<MammothResult>
  }
  export default mammoth
}
