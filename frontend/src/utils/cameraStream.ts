// Shared camera stream manager for the session lifecycle
// Keeps a single MediaStream instance that can be reused across modal opens
// and avoids re-prompting the user unnecessarily.

let sharedStream: MediaStream | null = null;

export const getSharedCameraStream = (): MediaStream | null => sharedStream;

export const setSharedCameraStream = (stream: MediaStream | null) => {
  sharedStream = stream;
};

// Stop and clear the shared stream (use on logout or when you want to fully release camera)
export const stopAndClearSharedStream = () => {
  if (sharedStream) {
    try {
      sharedStream.getTracks().forEach(t => t.stop());
    } catch {
      // ignore non-critical stop errors
      void 0;
    }
  }
  sharedStream = null;
};

// Helpers for session permission flag
const SESSION_PERMISSION_KEY = 'cameraPermissionGranted';

export const markPermissionGrantedForSession = () => {
  try {
    sessionStorage.setItem(SESSION_PERMISSION_KEY, 'true');
  } catch {
    // ignore storage errors (private mode, etc.)
    void 0;
  }
};

export const clearPermissionForSession = () => {
  try {
    sessionStorage.removeItem(SESSION_PERMISSION_KEY);
  } catch {
    // ignore storage errors
    void 0;
  }
};

export const wasPermissionGrantedThisSession = (): boolean => {
  try {
    return sessionStorage.getItem(SESSION_PERMISSION_KEY) === 'true';
  } catch {
    return false;
  }
};
