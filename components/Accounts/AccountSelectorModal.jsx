import { useEffect, useMemo, useState } from "react";
import {
    FlatList,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import AppIcon from "../AppIcon";

// Modal lists accounts grouped by owner: main user fullName + shared owners
export default function AccountSelectorModal({
  visible,
  onClose,
  accounts = [],
  sharedAccounts = [],
  fullName = "",
  selectedAccountId,
  onSelectAccount,
  onRefresh,
}) {
  const { theme } = useAppTheme();
  const owners = useMemo(() => {
    const currentUser = { id: "currentUser", name: fullName || "My Accounts" };
    const shared = (sharedAccounts || []).map((sharedAccount) => ({
      id: String(sharedAccount?.accountOwner?.userId ?? "shared"),
      name: sharedAccount?.accountOwner?.fullName ?? "Shared Account",
    }));
    return [currentUser, ...shared];
  }, [fullName, sharedAccounts]);

  const [activeOwner, setActiveOwner] = useState(
    owners.length ? owners[0].id : "currentUser",
  );
  const [ownersOpen, setOwnersOpen] = useState(false);

  // Ensure active owner stays valid when owners list changes (e.g., after login loads)
  useEffect(() => {
    if (!owners.find((o) => o.id === activeOwner)) {
      setActiveOwner(owners.length ? owners[0].id : "currentUser");
    }
  }, [owners, activeOwner]);
  const filteredAccounts = useMemo(() => {
    if (activeOwner === "currentUser") return accounts;
    const entry = (sharedAccounts || []).find(
      (s) =>
        String(
          s?.accountOwner?.userId ?? s?.accountOwner?.email ?? "shared",
        ) === String(activeOwner),
    );
    return entry?.accounts ?? [];
  }, [activeOwner, accounts, sharedAccounts]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity className="absolute inset-0" onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} />
      </TouchableOpacity>

      <View
        className="absolute left-0 right-0 bottom-0 rounded-t-3xl p-5"
        style={{
          height: 480,
          backgroundColor: theme.background,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 10,
        }}
      >
        {/* Drag handle */}
        <View className="items-center mb-3">
          <View
            className="w-12 h-1.5 rounded-full"
            style={{ backgroundColor: theme.secondary }}
          />
        </View>

        <View style={{ flexShrink: 0 }}>
          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-lg font-bold" style={{ color: theme.text }}>
              Select Account
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="p-2 rounded-full"
              style={{ backgroundColor: theme.card }}
            >
              <AppIcon name="close" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Owner Dropdown */}
          <View className="mb-4">
            <Text
              className="text-sm font-semibold mb-2"
              style={{ color: theme.secondary }}
            >
              Owner
            </Text>
            <TouchableOpacity
              onPress={() => setOwnersOpen((s) => !s)}
              className="flex-row items-center justify-between px-4 py-3 rounded-xl border"
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
            >
              <View className="flex-row items-center">
                <AppIcon name="person" size={16} color={theme.primary} />
                <Text
                  className="ml-2.5 font-semibold"
                  style={{ color: theme.text }}
                >
                  {owners.find((p) => p.id === activeOwner)?.name ??
                    "Select Owner"}
                </Text>
              </View>
              <AppIcon
                name={ownersOpen ? "expand-less" : "expand-more"}
                size={18}
                color={theme.secondary}
              />
            </TouchableOpacity>
            {ownersOpen && (
              <View
                className="mt-3 rounded-xl border overflow-hidden max-h-[200px]"
                style={{
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                }}
              >
                <ScrollView showsVerticalScrollIndicator={true}>
                  {owners.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => {
                        setActiveOwner(p.id);
                        setOwnersOpen(false);
                      }}
                      className="flex-row items-center px-4 py-3"
                      style={{
                        backgroundColor:
                          activeOwner === p.id ? theme.primary : "transparent",
                      }}
                    >
                      <AppIcon
                        name="person"
                        size={14}
                        color={activeOwner === p.id ? "#fff" : theme.secondary}
                      />
                      <Text
                        className="ml-3 font-medium"
                        style={{
                          color: activeOwner === p.id ? "#fff" : theme.text,
                        }}
                      >
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        {/* Accounts List (scrollable) */}
        <View className="flex-1">
          <Text
            className="text-sm font-semibold mb-2"
            style={{ color: theme.secondary }}
          >
            Accounts ({filteredAccounts.length})
          </Text>
          <FlatList
            data={filteredAccounts}
            keyExtractor={(i) => String(i.accountId ?? i.id)}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  onSelectAccount && onSelectAccount(item);
                  // Trigger refresh after account selection
                  setTimeout(() => {
                    onRefresh && onRefresh();
                  }, 100);
                  onClose && onClose();
                }}
                className="flex-row items-center justify-between p-4 rounded-xl mb-3 border"
                style={{
                  backgroundColor:
                    (item.accountId ?? item.id) === selectedAccountId
                      ? theme.primary + "20"
                      : theme.card,
                  borderColor:
                    (item.accountId ?? item.id) === selectedAccountId
                      ? theme.primary
                      : theme.border,
                }}
              >
                <View className="flex-row items-center flex-1">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: theme.primary + "30" }}
                  >
                    <AppIcon
                      name="account-balance-wallet"
                      size={20}
                      color={theme.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      className="text-base font-bold"
                      style={{ color: theme.text }}
                    >
                      {item.accountNumber ?? item.id}
                    </Text>
                    <Text
                      className="text-sm"
                      style={{ color: theme.secondary }}
                    >
                      {item.accountTypeName ?? item.type ?? "Account"}
                      {item.accountName ? ` • ${item.accountName}` : ""}
                    </Text>
                    {(item.balance != null || item.currency) && (
                      <Text
                        className="text-xs mt-1.5"
                        style={{ color: theme.secondary }}
                      >
                        Balance: {item.balance != null ? item.balance : "-"}{" "}
                        {item.currency ?? ""}
                      </Text>
                    )}
                  </View>
                </View>
                {(item.accountId ?? item.id) === selectedAccountId && (
                  <View
                    className="w-6 h-6 rounded-full items-center justify-center"
                    style={{ backgroundColor: theme.primary }}
                  >
                    <AppIcon name="check" size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}
