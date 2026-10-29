import { AccountDeletionController } from "./account-deletion.controller";
import type { FirebaseTokenVerifier } from "./firebase-token-verifier";
import type { UsersService } from "../users/users.service";
function setup() {
  const verifier = { verifyDeletionToken: jest.fn().mockResolvedValue("uid"), deleteFirebaseUser: jest.fn().mockResolvedValue(undefined) };
  const users = { beginDeletion: jest.fn().mockResolvedValue("id"), finishDeletion: jest.fn().mockResolvedValue(undefined) };
  const controller = new AccountDeletionController(verifier as unknown as FirebaseTokenVerifier, users as unknown as UsersService);
  return { verifier, users, controller };
}
it("token yokken silme başlamaz", async () => {
  const { controller, users } = setup();
  await expect(controller.delete()).rejects.toThrow();
  expect(users.beginDeletion).not.toHaveBeenCalled();
});
it("taze token doğrulanmadan veri silinmez", async () => {
  const { controller, verifier, users } = setup();
  verifier.verifyDeletionToken.mockRejectedValueOnce(new Error("recent login required"));
  await expect(controller.delete("Bearer token")).rejects.toThrow();
  expect(users.beginDeletion).not.toHaveBeenCalled();
});
it("Firebase silinince backend verileri temizlenir; Firebase hatasında yeniden deneme için kayıt korunur", async () => {
  const { controller, verifier, users } = setup();
  verifier.deleteFirebaseUser.mockRejectedValueOnce(new Error("temporary"));
  await expect(controller.delete("Bearer token")).rejects.toThrow();
  expect(users.finishDeletion).not.toHaveBeenCalled();
  await controller.delete("Bearer token");
  expect(users.finishDeletion).toHaveBeenCalledWith("id");
});
