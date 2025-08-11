// src/screens/requestQueue.js
// Handles sequential API requests and retries conflicts

class RequestQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxConcurrent = 1;
  }

  async add(request) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject, timestamp: Date.now() });
      this.process();
    });
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const { request, resolve, reject } = this.queue.shift();

    try {
      const result = await request();
      resolve(result);
    } catch (error) {
      if (error?.response?.status === 409) {
        console.warn('Request conflict detected, retrying...', error.message);
        setTimeout(() => {
          this.queue.unshift({ request, resolve, reject, timestamp: Date.now() });
          this.processing = false;
          this.process();
        }, 1000);
        return;
      }
      reject(error);
    } finally {
      this.processing = false;
      setTimeout(() => this.process(), 100);
    }
  }

  clear() {
    this.queue = [];
    this.processing = false;
  }
}

const requestQueue = new RequestQueue();

export { RequestQueue, requestQueue };
