export function isDemoAccount(account) {
  if (!account) return false;

  const flag =
    account?.isDemo ??
    account?.demo ??
    account?.isDemoAccount ??
    account?.demoAccount ??
    account?.isDemoAcc;

  if (flag === true || flag === "true") return true;

  const typeText = String(
    account?.accountTypeName ??
      account?.accountType ??
      account?.type ??
      account?.accountName ??
      account?.name ??
      "",
  )
    .trim()
    .toLowerCase();

  if (typeText.includes("demo")) return true;

  const groupText = String(account?.group ?? account?.accountGroup ?? "")
    .trim()
    .toLowerCase();

  if (groupText.includes("demo")) return true;

  return false;
}

export function filterOutDemoAccounts(accounts) {
  const list = Array.isArray(accounts) ? accounts : [];
  return list.filter((a) => !isDemoAccount(a));
}

export function filterSharedAccountsOutDemo(sharedAccounts) {
  const list = Array.isArray(sharedAccounts) ? sharedAccounts : [];
  return list
    .map((entry) => {
      const nextAccounts = filterOutDemoAccounts(entry?.accounts);
      return { ...entry, accounts: nextAccounts };
    })
    .filter((entry) => (entry?.accounts || []).length > 0);
}
