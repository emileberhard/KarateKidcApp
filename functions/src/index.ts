import * as admin from "firebase-admin";

admin.initializeApp();

export { getCompletion } from './getCompletion';
export { resetUnitsDaily } from './resetUnitsDaily';