const asyncHandler = (fn) => {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            console.error(error);
            throw error;
        }
    };
};


export { asyncHandler }