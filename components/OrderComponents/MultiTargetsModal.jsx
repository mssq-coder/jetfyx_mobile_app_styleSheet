import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AppIcon from '../AppIcon';

const MultiTargetsModal = ({
  visible,
  theme,
  targetsOrder,
  targetsLoading,
  targetsSaving,
  targetsError,
  setTargetsError,
  onClose,

  editingTargetKey,
  setEditingTargetKey,
  editTargetLot,
  setEditTargetLot,
  editTargetSl,
  setEditTargetSl,
  editTargetTp,
  setEditTargetTp,

  newTargetLot,
  setNewTargetLot,
  newTargetSl,
  setNewTargetSl,
  newTargetTp,
  setNewTargetTp,

  getOrderId,
  getPriceDigits,
  getPriceStep,
  getMarketReferencePrice,
  getOrderLotSize,
  getMinLotSizeForOrder,
  getLotStepForOrder,
  countDecimals,
  getTargetsForOrderId,

  validateSlTp,
  toNumberOrZero,
  formatWithDigits,
  formatWithDecimals,
  adjustInputByStep,
  adjustNumberInputByStep,

  getTargetId,
  getTargetKey,
  removeLocalTempTarget,
  removeTarget,
  updateTarget,
  createTarget,

  styles,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!targetsSaving) onClose?.();
      }}
    >
      <View style={styles.centerModalRoot}>
        <Pressable
          style={styles.centerBackdrop}
          onPress={() => {
            if (!targetsSaving) onClose?.();
          }}
        />

        <View style={[styles.centerCard, { backgroundColor: theme.card }]}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>
            Multi Targets
          </Text>

          {targetsOrder
            ? (() => {
                const oid = getOrderId(targetsOrder);
                const symbol =
                  targetsOrder?.symbol ??
                  targetsOrder?.instrument ??
                  targetsOrder?.instrumentName ??
                  '—';
                const digits = getPriceDigits(targetsOrder);
                const step = getPriceStep(targetsOrder);
                const marketRef = getMarketReferencePrice(targetsOrder);
                const orderLot = getOrderLotSize(targetsOrder);
                const minLot = getMinLotSizeForOrder(targetsOrder);
                const lotStep = getLotStepForOrder(targetsOrder);
                const lotDecimals = countDecimals(lotStep);
                const targets = oid != null ? getTargetsForOrderId(oid) : [];
                const used = targets.reduce(
                  (sum, t) => sum + toNumberOrZero(t?.lotSize),
                  0
                );
                const remaining = Math.max(0, orderLot - used);

                const newSlValue = toNumberOrZero(newTargetSl);
                const newTpValue = toNumberOrZero(newTargetTp);
                const { slError: newSlError, tpError: newTpError } = validateSlTp(
                  targetsOrder,
                  newSlValue,
                  newTpValue
                );

                const newLotValue = toNumberOrZero(newTargetLot);
                const createDisabled =
                  targetsSaving ||
                  !(newLotValue > 0) ||
                  (minLot > 0 && newLotValue < minLot) ||
                  newLotValue > remaining ||
                  Boolean(newSlError) ||
                  Boolean(newTpError);

                const beginEdit = (t, idx) => {
                  const key = getTargetKey(t, idx);
                  const id = getTargetId(t);
                  if (id == null) return;
                  setEditingTargetKey(key);
                  setEditTargetLot(String(t?.lotSize ?? ''));
                  setEditTargetSl(String(t?.stopLoss ?? ''));
                  setEditTargetTp(String(t?.takeProfit ?? ''));
                  setTargetsError?.(null);
                };

                const cancelEdit = () => {
                  setEditingTargetKey(null);
                  setEditTargetLot('');
                  setEditTargetSl('');
                  setEditTargetTp('');
                  setTargetsError?.(null);
                };

                return (
                  <>
                    <Text style={{ color: theme.secondary, fontSize: 12, marginTop: 6 }}>
                      {symbol} · Order Lot {orderLot} · Min Lot {minLot || '—'} · Remaining {remaining}
                    </Text>

                    <Text style={{ color: theme.secondary, fontSize: 11, marginTop: 4 }}>
                      Step: {step} · Lot step: {lotStep}
                    </Text>

                    {targetsLoading ? (
                      <View style={{ marginTop: 10 }}>
                        <ActivityIndicator size="small" color={theme.primary} />
                      </View>
                    ) : null}

                    <View style={{ marginTop: 12 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: theme.border,
                          backgroundColor: theme.background,
                        }}
                      >
                        <Text style={{ flex: 1, color: theme.secondary, fontSize: 11, fontWeight: '800' }}>
                          LOT
                        </Text>
                        <Text style={{ flex: 1, color: theme.secondary, fontSize: 11, fontWeight: '800' }}>
                          SL
                        </Text>
                        <Text style={{ flex: 1, color: theme.secondary, fontSize: 11, fontWeight: '800' }}>
                          TP
                        </Text>
                        <View style={{ width: 64 }} />
                      </View>

                      <View style={{ maxHeight: 240, marginTop: 8 }}>
                        {(targets || []).length ? (
                          <ScrollView showsVerticalScrollIndicator={false}>
                            {(targets || []).map((t, idx) => {
                              const id = getTargetId(t);
                              const key = getTargetKey(t, idx);
                              const isEditing = String(editingTargetKey) === String(key);

                              const lotText =
                                toNumberOrZero(t?.lotSize) > 0
                                  ? formatWithDecimals(
                                      toNumberOrZero(t?.lotSize),
                                      lotDecimals
                                    )
                                  : '--';
                              const slText =
                                toNumberOrZero(t?.stopLoss) > 0
                                  ? formatWithDigits(
                                      toNumberOrZero(t?.stopLoss),
                                      digits
                                    )
                                  : '--';
                              const tpText =
                                toNumberOrZero(t?.takeProfit) > 0
                                  ? formatWithDigits(
                                      toNumberOrZero(t?.takeProfit),
                                      digits
                                    )
                                  : '--';

                              const editSlValue = toNumberOrZero(editTargetSl);
                              const editTpValue = toNumberOrZero(editTargetTp);
                              const { slError: editSlError, tpError: editTpError } =
                                validateSlTp(targetsOrder, editSlValue, editTpValue);

                              const editLotValue = toNumberOrZero(editTargetLot);
                              const usedOther = (targets || [])
                                .filter((x, xIdx) =>
                                  getTargetKey(x, xIdx) !== String(key)
                                )
                                .reduce((sum, x) => sum + toNumberOrZero(x?.lotSize), 0);
                              const remainingForThis = Math.max(0, orderLot - usedOther);

                              const updateDisabled =
                                targetsSaving ||
                                id == null ||
                                !(editLotValue > 0) ||
                                (minLot > 0 && editLotValue < minLot) ||
                                editLotValue > remainingForThis ||
                                Boolean(editSlError) ||
                                Boolean(editTpError);

                              return (
                                <View
                                  key={key}
                                  style={{
                                    marginBottom: 10,
                                    borderWidth: 1,
                                    borderColor: theme.border,
                                    borderRadius: 12,
                                    backgroundColor: theme.background,
                                    padding: 10,
                                  }}
                                >
                                  {!isEditing ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                      <Text
                                        style={{
                                          flex: 1,
                                          color: theme.text,
                                          fontSize: 12,
                                          fontWeight: '700',
                                        }}
                                      >
                                        {lotText}
                                      </Text>
                                      <Text
                                        style={{
                                          flex: 1,
                                          color: theme.text,
                                          fontSize: 12,
                                          fontWeight: '700',
                                        }}
                                      >
                                        {slText}
                                      </Text>
                                      <Text
                                        style={{
                                          flex: 1,
                                          color: theme.text,
                                          fontSize: 12,
                                          fontWeight: '700',
                                        }}
                                      >
                                        {tpText}
                                      </Text>

                                      <View
                                        style={{
                                          width: 64,
                                          flexDirection: 'row',
                                          justifyContent: 'flex-end',
                                          gap: 10,
                                        }}
                                      >
                                        {id == null ? (
                                          <TouchableOpacity
                                            onPress={() => {
                                              if (oid != null)
                                                removeLocalTempTarget(oid, key);
                                            }}
                                            disabled={targetsSaving}
                                            style={{
                                              width: 28,
                                              height: 28,
                                              borderRadius: 8,
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              backgroundColor: theme.card,
                                              borderWidth: 1,
                                              borderColor: theme.border,
                                            }}
                                            accessibilityRole="button"
                                            accessibilityLabel="Remove syncing target"
                                          >
                                            <AppIcon
                                              name="close"
                                              size={18}
                                              color={theme.secondary}
                                            />
                                          </TouchableOpacity>
                                        ) : (
                                          <>
                                            <TouchableOpacity
                                              onPress={() => beginEdit(t, idx)}
                                              disabled={targetsSaving}
                                              style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: 8,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: theme.card,
                                                borderWidth: 1,
                                                borderColor: theme.border,
                                              }}
                                              accessibilityRole="button"
                                              accessibilityLabel="Edit target"
                                            >
                                              <AppIcon
                                                name="edit"
                                                size={18}
                                                color={theme.primary}
                                              />
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                              onPress={() => {
                                                Alert.alert(
                                                  'Delete target',
                                                  'Delete this target?',
                                                  [
                                                    {
                                                      text: 'Cancel',
                                                      style: 'cancel',
                                                    },
                                                    {
                                                      text: 'Delete',
                                                      style: 'destructive',
                                                      onPress: () => removeTarget(id),
                                                    },
                                                  ]
                                                );
                                              }}
                                              disabled={targetsSaving}
                                              style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: 8,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: theme.card,
                                                borderWidth: 1,
                                                borderColor: theme.border,
                                              }}
                                              accessibilityRole="button"
                                              accessibilityLabel="Delete target"
                                            >
                                              <AppIcon
                                                name="delete"
                                                size={18}
                                                color={theme.negative}
                                              />
                                            </TouchableOpacity>
                                          </>
                                        )}
                                      </View>
                                    </View>
                                  ) : (
                                    <View style={{ gap: 10 }}>
                                      <Text
                                        style={{
                                          color: theme.secondary,
                                          fontSize: 11,
                                          fontWeight: '700',
                                        }}
                                      >
                                        Editing Target #{id}
                                      </Text>

                                      <View style={{ gap: 10 }}>
                                        <View>
                                          <Text
                                            style={{
                                              color: theme.secondary,
                                              fontSize: 11,
                                              marginBottom: 6,
                                            }}
                                          >
                                            Lot
                                          </Text>
                                          <View
                                            style={{
                                              flexDirection: 'row',
                                              alignItems: 'center',
                                              gap: 10,
                                            }}
                                          >
                                            <TouchableOpacity
                                              disabled={targetsSaving}
                                              onPress={() =>
                                                setEditTargetLot((prev) =>
                                                  adjustNumberInputByStep(
                                                    prev,
                                                    lotStep,
                                                    -1,
                                                    lotDecimals,
                                                    { min: 0 }
                                                  )
                                                )
                                              }
                                              style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: 12,
                                                backgroundColor: theme.card,
                                                borderWidth: 1,
                                                borderColor: theme.border,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                              }}
                                            >
                                              <Text
                                                style={{
                                                  color: theme.text,
                                                  fontSize: 18,
                                                  fontWeight: '800',
                                                }}
                                              >
                                                −
                                              </Text>
                                            </TouchableOpacity>

                                            <TextInput
                                              value={editTargetLot}
                                              onChangeText={(v) => {
                                                setEditTargetLot(v);
                                                setTargetsError?.(null);
                                              }}
                                              editable={!targetsSaving}
                                              keyboardType="decimal-pad"
                                              placeholder={formatWithDecimals(0, lotDecimals)}
                                              placeholderTextColor={theme.secondary}
                                              style={[
                                                styles.input,
                                                {
                                                  flex: 1,
                                                  color: theme.text,
                                                  borderColor: theme.border,
                                                  backgroundColor: theme.card,
                                                  textAlign: 'center',
                                                },
                                              ]}
                                            />

                                            <TouchableOpacity
                                              disabled={targetsSaving}
                                              onPress={() =>
                                                setEditTargetLot((prev) =>
                                                  adjustNumberInputByStep(
                                                    prev,
                                                    lotStep,
                                                    +1,
                                                    lotDecimals,
                                                    { min: 0 }
                                                  )
                                                )
                                              }
                                              style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: 12,
                                                backgroundColor: theme.card,
                                                borderWidth: 1,
                                                borderColor: theme.border,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                              }}
                                            >
                                              <Text
                                                style={{
                                                  color: theme.text,
                                                  fontSize: 18,
                                                  fontWeight: '800',
                                                }}
                                              >
                                                +
                                              </Text>
                                            </TouchableOpacity>
                                          </View>
                                        </View>

                                        <View>
                                          <Text
                                            style={{
                                              color: theme.secondary,
                                              fontSize: 11,
                                              marginBottom: 6,
                                            }}
                                          >
                                            Stop Loss
                                          </Text>
                                          <View
                                            style={{
                                              flexDirection: 'row',
                                              alignItems: 'center',
                                              gap: 10,
                                            }}
                                          >
                                            <TouchableOpacity
                                              disabled={targetsSaving}
                                              onPress={() =>
                                                setEditTargetSl((prev) =>
                                                  adjustInputByStep(
                                                    prev,
                                                    step,
                                                    -1,
                                                    digits
                                                  )
                                                )
                                              }
                                              style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: 12,
                                                backgroundColor: theme.card,
                                                borderWidth: 1,
                                                borderColor: theme.border,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                              }}
                                            >
                                              <Text
                                                style={{
                                                  color: theme.text,
                                                  fontSize: 18,
                                                  fontWeight: '800',
                                                }}
                                              >
                                                −
                                              </Text>
                                            </TouchableOpacity>

                                            <TextInput
                                              value={editTargetSl}
                                              onChangeText={(v) => {
                                                setEditTargetSl(v);
                                                setTargetsError?.(null);
                                              }}
                                              editable={!targetsSaving}
                                              keyboardType="decimal-pad"
                                              placeholder={formatWithDigits(0, digits)}
                                              placeholderTextColor={theme.secondary}
                                              onPressIn={() => {
                                                if (targetsSaving) return;
                                                if (!(marketRef > 0)) return;
                                                if (toNumberOrZero(editTargetSl) > 0)
                                                  return;
                                                setEditTargetSl(
                                                  formatWithDigits(marketRef, digits)
                                                );
                                              }}
                                              onFocus={() => {
                                                if (targetsSaving) return;
                                                if (!(marketRef > 0)) return;
                                                if (toNumberOrZero(editTargetSl) > 0)
                                                  return;
                                                setEditTargetSl(
                                                  formatWithDigits(marketRef, digits)
                                                );
                                              }}
                                              style={[
                                                styles.input,
                                                {
                                                  flex: 1,
                                                  color: theme.text,
                                                  borderColor: theme.border,
                                                  backgroundColor: theme.card,
                                                  textAlign: 'center',
                                                },
                                              ]}
                                            />

                                            <TouchableOpacity
                                              disabled={targetsSaving}
                                              onPress={() =>
                                                setEditTargetSl((prev) =>
                                                  adjustInputByStep(
                                                    prev,
                                                    step,
                                                    +1,
                                                    digits
                                                  )
                                                )
                                              }
                                              style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: 12,
                                                backgroundColor: theme.card,
                                                borderWidth: 1,
                                                borderColor: theme.border,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                              }}
                                            >
                                              <Text
                                                style={{
                                                  color: theme.text,
                                                  fontSize: 18,
                                                  fontWeight: '800',
                                                }}
                                              >
                                                +
                                              </Text>
                                            </TouchableOpacity>
                                          </View>
                                          {editSlError ? (
                                            <Text
                                              style={{
                                                marginTop: 6,
                                                color: theme.negative,
                                                fontSize: 11,
                                                fontWeight: '700',
                                              }}
                                            >
                                              {editSlError}
                                            </Text>
                                          ) : null}
                                        </View>

                                        <View>
                                          <Text
                                            style={{
                                              color: theme.secondary,
                                              fontSize: 11,
                                              marginBottom: 6,
                                            }}
                                          >
                                            Take Profit
                                          </Text>
                                          <View
                                            style={{
                                              flexDirection: 'row',
                                              alignItems: 'center',
                                              gap: 10,
                                            }}
                                          >
                                            <TouchableOpacity
                                              disabled={targetsSaving}
                                              onPress={() =>
                                                setEditTargetTp((prev) =>
                                                  adjustInputByStep(
                                                    prev,
                                                    step,
                                                    -1,
                                                    digits
                                                  )
                                                )
                                              }
                                              style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: 12,
                                                backgroundColor: theme.card,
                                                borderWidth: 1,
                                                borderColor: theme.border,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                              }}
                                            >
                                              <Text
                                                style={{
                                                  color: theme.text,
                                                  fontSize: 18,
                                                  fontWeight: '800',
                                                }}
                                              >
                                                −
                                              </Text>
                                            </TouchableOpacity>

                                            <TextInput
                                              value={editTargetTp}
                                              onChangeText={(v) => {
                                                setEditTargetTp(v);
                                                setTargetsError?.(null);
                                              }}
                                              editable={!targetsSaving}
                                              keyboardType="decimal-pad"
                                              placeholder={formatWithDigits(0, digits)}
                                              placeholderTextColor={theme.secondary}
                                              onPressIn={() => {
                                                if (targetsSaving) return;
                                                if (!(marketRef > 0)) return;
                                                if (toNumberOrZero(editTargetTp) > 0)
                                                  return;
                                                setEditTargetTp(
                                                  formatWithDigits(marketRef, digits)
                                                );
                                              }}
                                              onFocus={() => {
                                                if (targetsSaving) return;
                                                if (!(marketRef > 0)) return;
                                                if (toNumberOrZero(editTargetTp) > 0)
                                                  return;
                                                setEditTargetTp(
                                                  formatWithDigits(marketRef, digits)
                                                );
                                              }}
                                              style={[
                                                styles.input,
                                                {
                                                  flex: 1,
                                                  color: theme.text,
                                                  borderColor: theme.border,
                                                  backgroundColor: theme.card,
                                                  textAlign: 'center',
                                                },
                                              ]}
                                            />

                                            <TouchableOpacity
                                              disabled={targetsSaving}
                                              onPress={() =>
                                                setEditTargetTp((prev) =>
                                                  adjustInputByStep(
                                                    prev,
                                                    step,
                                                    +1,
                                                    digits
                                                  )
                                                )
                                              }
                                              style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: 12,
                                                backgroundColor: theme.card,
                                                borderWidth: 1,
                                                borderColor: theme.border,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                              }}
                                            >
                                              <Text
                                                style={{
                                                  color: theme.text,
                                                  fontSize: 18,
                                                  fontWeight: '800',
                                                }}
                                              >
                                                +
                                              </Text>
                                            </TouchableOpacity>
                                          </View>
                                          {editTpError ? (
                                            <Text
                                              style={{
                                                marginTop: 6,
                                                color: theme.negative,
                                                fontSize: 11,
                                                fontWeight: '700',
                                              }}
                                            >
                                              {editTpError}
                                            </Text>
                                          ) : null}
                                        </View>
                                      </View>

                                      <View
                                        style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}
                                      >
                                        <TouchableOpacity
                                          onPress={cancelEdit}
                                          disabled={targetsSaving}
                                          style={{
                                            flex: 1,
                                            paddingVertical: 10,
                                            borderRadius: 10,
                                            backgroundColor: theme.background,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderWidth: 1,
                                            borderColor: theme.border,
                                          }}
                                        >
                                          <Text
                                            style={{
                                              color: theme.text,
                                              fontWeight: '800',
                                              fontSize: 12,
                                            }}
                                          >
                                            Cancel
                                          </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                          onPress={() => {
                                            if (id == null) return;
                                            updateTarget(id, {
                                              lotSize: toNumberOrZero(editTargetLot),
                                              stopLoss: toNumberOrZero(editTargetSl),
                                              takeProfit: toNumberOrZero(editTargetTp),
                                            });
                                            cancelEdit();
                                          }}
                                          disabled={updateDisabled}
                                          style={{
                                            flex: 1,
                                            paddingVertical: 10,
                                            borderRadius: 10,
                                            backgroundColor: updateDisabled
                                              ? theme.secondary + '30'
                                              : theme.primary,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                          }}
                                        >
                                          <Text
                                            style={{
                                              color: '#fff',
                                              fontWeight: '800',
                                              fontSize: 12,
                                            }}
                                          >
                                            Update
                                          </Text>
                                        </TouchableOpacity>
                                      </View>
                                    </View>
                                  )}

                                  {id == null ? (
                                    <Text style={{ marginTop: 6, color: theme.secondary, fontSize: 11 }}>
                                      Syncing with server…
                                    </Text>
                                  ) : null}
                                </View>
                              );
                            })}
                          </ScrollView>
                        ) : (
                          <Text style={{ marginTop: 10, color: theme.secondary, fontSize: 12 }}>
                            No targets yet.
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={{ marginTop: 6 }}>
                      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800' }}>
                        Create new target
                      </Text>
                      <Text style={{ color: theme.secondary, fontSize: 11, marginTop: 2 }}>
                        Lot must be ≥ {minLot || '—'} and ≤ remaining.
                      </Text>

                      <View style={{ marginTop: 10, gap: 10 }}>
                        <View>
                          <Text style={{ color: theme.secondary, fontSize: 11, marginBottom: 6 }}>
                            Lot
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <TouchableOpacity
                              disabled={targetsSaving}
                              onPress={() =>
                                setNewTargetLot((prev) =>
                                  adjustNumberInputByStep(
                                    prev,
                                    lotStep,
                                    -1,
                                    lotDecimals,
                                    { min: 0 }
                                  )
                                )
                              }
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                backgroundColor: theme.background,
                                borderWidth: 1,
                                borderColor: theme.border,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>−</Text>
                            </TouchableOpacity>

                            <TextInput
                              value={newTargetLot}
                              onChangeText={(v) => {
                                setNewTargetLot(v);
                                setTargetsError?.(null);
                              }}
                              editable={!targetsSaving}
                              keyboardType="decimal-pad"
                              placeholder={formatWithDecimals(remaining, lotDecimals)}
                              placeholderTextColor={theme.secondary}
                              style={[
                                styles.input,
                                {
                                  flex: 1,
                                  color: theme.text,
                                  borderColor: theme.border,
                                  backgroundColor: theme.background,
                                  textAlign: 'center',
                                },
                              ]}
                            />

                            <TouchableOpacity
                              disabled={targetsSaving}
                              onPress={() =>
                                setNewTargetLot((prev) =>
                                  adjustNumberInputByStep(
                                    prev,
                                    lotStep,
                                    +1,
                                    lotDecimals,
                                    { min: 0 }
                                  )
                                )
                              }
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                backgroundColor: theme.background,
                                borderWidth: 1,
                                borderColor: theme.border,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>+</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View>
                          <Text style={{ color: theme.secondary, fontSize: 11, marginBottom: 6 }}>
                            Stop Loss
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <TouchableOpacity
                              disabled={targetsSaving}
                              onPress={() =>
                                setNewTargetSl((prev) =>
                                  adjustInputByStep(prev, step, -1, digits)
                                )
                              }
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                backgroundColor: theme.background,
                                borderWidth: 1,
                                borderColor: theme.border,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>−</Text>
                            </TouchableOpacity>

                            <TextInput
                              value={newTargetSl}
                              onChangeText={(v) => {
                                setNewTargetSl(v);
                                setTargetsError?.(null);
                              }}
                              editable={!targetsSaving}
                              keyboardType="decimal-pad"
                              placeholder={formatWithDigits(0, digits)}
                              placeholderTextColor={theme.secondary}
                              onPressIn={() => {
                                if (targetsSaving) return;
                                if (!(marketRef > 0)) return;
                                if (toNumberOrZero(newTargetSl) > 0) return;
                                setNewTargetSl(formatWithDigits(marketRef, digits));
                              }}
                              onFocus={() => {
                                if (targetsSaving) return;
                                if (!(marketRef > 0)) return;
                                if (toNumberOrZero(newTargetSl) > 0) return;
                                setNewTargetSl(formatWithDigits(marketRef, digits));
                              }}
                              style={[
                                styles.input,
                                {
                                  flex: 1,
                                  color: theme.text,
                                  borderColor: theme.border,
                                  backgroundColor: theme.background,
                                  textAlign: 'center',
                                },
                              ]}
                            />

                            <TouchableOpacity
                              disabled={targetsSaving}
                              onPress={() =>
                                setNewTargetSl((prev) =>
                                  adjustInputByStep(prev, step, +1, digits)
                                )
                              }
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                backgroundColor: theme.background,
                                borderWidth: 1,
                                borderColor: theme.border,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>+</Text>
                            </TouchableOpacity>
                          </View>
                          {newSlError ? (
                            <Text style={{ marginTop: 6, color: theme.negative, fontSize: 11, fontWeight: '700' }}>
                              {newSlError}
                            </Text>
                          ) : null}
                        </View>

                        <View>
                          <Text style={{ color: theme.secondary, fontSize: 11, marginBottom: 6 }}>
                            Take Profit
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <TouchableOpacity
                              disabled={targetsSaving}
                              onPress={() =>
                                setNewTargetTp((prev) =>
                                  adjustInputByStep(prev, step, -1, digits)
                                )
                              }
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                backgroundColor: theme.background,
                                borderWidth: 1,
                                borderColor: theme.border,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>−</Text>
                            </TouchableOpacity>

                            <TextInput
                              value={newTargetTp}
                              onChangeText={(v) => {
                                setNewTargetTp(v);
                                setTargetsError?.(null);
                              }}
                              editable={!targetsSaving}
                              keyboardType="decimal-pad"
                              placeholder={formatWithDigits(0, digits)}
                              placeholderTextColor={theme.secondary}
                              onPressIn={() => {
                                if (targetsSaving) return;
                                if (!(marketRef > 0)) return;
                                if (toNumberOrZero(newTargetTp) > 0) return;
                                setNewTargetTp(formatWithDigits(marketRef, digits));
                              }}
                              onFocus={() => {
                                if (targetsSaving) return;
                                if (!(marketRef > 0)) return;
                                if (toNumberOrZero(newTargetTp) > 0) return;
                                setNewTargetTp(formatWithDigits(marketRef, digits));
                              }}
                              style={[
                                styles.input,
                                {
                                  flex: 1,
                                  color: theme.text,
                                  borderColor: theme.border,
                                  backgroundColor: theme.background,
                                  textAlign: 'center',
                                },
                              ]}
                            />

                            <TouchableOpacity
                              disabled={targetsSaving}
                              onPress={() =>
                                setNewTargetTp((prev) =>
                                  adjustInputByStep(prev, step, +1, digits)
                                )
                              }
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                backgroundColor: theme.background,
                                borderWidth: 1,
                                borderColor: theme.border,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>+</Text>
                            </TouchableOpacity>
                          </View>
                          {newTpError ? (
                            <Text style={{ marginTop: 6, color: theme.negative, fontSize: 11, fontWeight: '700' }}>
                              {newTpError}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={createTarget}
                        disabled={createDisabled}
                        style={{
                          marginTop: 10,
                          paddingVertical: 12,
                          borderRadius: 10,
                          backgroundColor: createDisabled
                            ? theme.secondary + '30'
                            : theme.primary,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {targetsSaving ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>
                            Create Target
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                );
              })()
            : null}

          {targetsError ? (
            <Text style={{ marginTop: 10, color: theme.negative, fontSize: 12 }}>
              {targetsError}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity
              onPress={() => onClose?.()}
              disabled={targetsSaving}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: theme.background,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 12 }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default MultiTargetsModal;
