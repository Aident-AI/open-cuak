export class ErrorTransformation {
  public static convertErrorToObject(error: Error) {
    return JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)));
  }

  public static convertChromeRuntimeLastErrorToObject(error: chrome.runtime.LastError) {
    const e = new Error(JSON.parse(JSON.stringify(error.message)));
    return ErrorTransformation.convertErrorToObject(e);
  }
}
