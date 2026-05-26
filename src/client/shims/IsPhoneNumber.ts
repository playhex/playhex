// Stub: replaces class-validator's IsPhoneNumber to avoid bundling libphonenumber-js
// Can be removed when https://github.com/typestack/class-validator/issues/2682 is fixed.
export const IS_PHONE_NUMBER = 'isPhoneNumber';
export const isPhoneNumber = () => false;
export const IsPhoneNumber = () => () => {};
