// src/utils/debounce.js

/**
 * Advanced debounce with support for leading/trailing edge and maxWait.
 * Based on lodash's debounce implementation.
 */
export const advancedDebounce = (func, wait, options = {}) => {
  const { leading = false, trailing = true, maxWait } = options;

  let lastArgs, lastThis;
  let result;
  let timerId;
  let lastCallTime;
  let lastInvokeTime = 0;
  const useMaxWait = typeof maxWait === "number";

  const invokeFunc = (time) => {
    const args = lastArgs;
    const thisArg = lastThis;

    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  };

  const startTimer = (pendingFunc, waitTime) =>
    setTimeout(pendingFunc, waitTime);

  const leadingEdge = (time) => {
    lastInvokeTime = time;
    timerId = startTimer(timerExpired, wait);
    return leading ? invokeFunc(time) : result;
  };

  const remainingWait = (time) => {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;
    return useMaxWait
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  };

  const shouldInvoke = (time) => {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === undefined ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (useMaxWait && timeSinceLastInvoke >= maxWait)
    );
  };

  const timerExpired = () => {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timerId = startTimer(timerExpired, remainingWait(time));
  };

  const trailingEdge = (time) => {
    timerId = undefined;

    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = undefined;
    return result;
  };

  const debounced = function (...args) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (useMaxWait) {
        timerId = startTimer(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timerId === undefined) {
      timerId = startTimer(timerExpired, wait);
    }
    return result;
  };

  debounced.cancel = () => {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = undefined;
  };

  debounced.flush = () =>
    timerId === undefined ? result : trailingEdge(Date.now());

  return debounced;
};

/**
 * Basic debounce API built on top of advancedDebounce.
 * If `immediate` is true, the function fires on the leading edge.
 */
export const debounce = (func, wait, immediate = false) =>
  advancedDebounce(func, wait, { leading: immediate, trailing: !immediate });

/**
 * Throttle implementation using advancedDebounce.
 * Invokes the function at most once per `limit` milliseconds.
 */
export const throttle = (func, limit) =>
  advancedDebounce(func, limit, {
    leading: true,
    trailing: true,
    maxWait: limit,
  });

/**
 * Request deduplication utility
 */
export const createRequestDeduplicator = () => {
  const pendingRequests = new Map();

  return {
    deduplicate: (key, requestFn) => {
      if (pendingRequests.has(key)) {
        return pendingRequests.get(key);
      }

      const promise = requestFn().finally(() => {
        pendingRequests.delete(key);
      });

      pendingRequests.set(key, promise);
      return promise;
    },

    clear: () => {
      pendingRequests.clear();
    },

    hasPending: (key) => pendingRequests.has(key),
  };
};

export default {
  debounce,
  throttle,
  advancedDebounce,
  createRequestDeduplicator,
};
