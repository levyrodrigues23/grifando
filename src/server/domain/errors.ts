// Thrown when a record doesn't exist or belongs to another session's user —
// deliberately indistinguishable so ids can't be probed. Routes map it to 404.
export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found`);
    this.name = "NotFoundError";
  }
}
