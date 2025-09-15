// Utility for testing EventSource connections
export const testEventSource = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      const testSource = new EventSource(url);
      let hasReceived = false;

      const cleanup = () => {
        testSource.close();
      };

      testSource.onopen = () => {
        console.log('EventSource test: Connection opened successfully');
        if (!hasReceived) {
          // If we can open but don't receive data quickly, still consider it working
          setTimeout(() => {
            cleanup();
            resolve(true);
          }, 1000);
        }
      };

      testSource.onmessage = (event) => {
        console.log('EventSource test: Received message:', event.data);
        hasReceived = true;
        cleanup();
        resolve(true);
      };

      testSource.onerror = (error) => {
        console.error('EventSource test: Error occurred:', error);
        cleanup();
        resolve(false);
      };

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!hasReceived) {
          console.log('EventSource test: Timeout');
          cleanup();
          resolve(false);
        }
      }, 5000);

    } catch (error) {
      console.error('EventSource test: Exception:', error);
      resolve(false);
    }
  });
};

// Check if EventSource is supported
export const isEventSourceSupported = (): boolean => {
  return typeof EventSource !== 'undefined';
};

// Get EventSource readyState as string
export const getEventSourceState = (source: EventSource): string => {
  switch (source.readyState) {
    case EventSource.CONNECTING:
      return 'CONNECTING';
    case EventSource.OPEN:
      return 'OPEN';
    case EventSource.CLOSED:
      return 'CLOSED';
    default:
      return 'UNKNOWN';
  }
};

// Debug EventSource connection
export const debugEventSource = (url: string): void => {
  console.log('=== EventSource Debug Info ===');
  console.log('EventSource supported:', isEventSourceSupported());
  console.log('Test URL:', url);
  console.log('Current origin:', window.location.origin);
  console.log('User agent:', navigator.userAgent);
  
  if (isEventSourceSupported()) {
    testEventSource(url).then(success => {
      console.log('EventSource test result:', success ? 'SUCCESS' : 'FAILED');
    });
  }
};
