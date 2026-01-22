import React from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';

const UpdateSlTpModal = ({
  visible,
  theme,
  order,
  saving,
  slInput,
  tpInput,
  remarkInput,
  setSlInput,
  setTpInput,
  setRemarkInput,
  setUpdateError,
  onSubmit,
  onClose,
  updateError,
  slFieldError,
  tpFieldError,
  getOrderSide,
  getPriceDigits,
  getPriceStep,
  getBuySellValues,
  getMarketReferencePrice,
  formatWithDigits,
  adjustInputByStep,
  toNumberOrZero,
  isPendingOrder,
  styles,
}) => {
  const liveOrder = order;
  const side = getOrderSide(liveOrder);
  const isBuy = side.includes('buy');
  const isSell = side.includes('sell');
  const digits = getPriceDigits(liveOrder);
  const step = getPriceStep(liveOrder);
  const { buy, sell } = getBuySellValues(liveOrder);
  const marketRef = getMarketReferencePrice(liveOrder);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!saving) onClose?.();
      }}
    >
      <View style={styles.centerModalRoot}>
        <Pressable
          style={styles.centerBackdrop}
          onPress={() => {
            if (!saving) onClose?.();
          }}
        />

        <View style={[styles.centerCard, { backgroundColor: theme.card }]}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>
            Update SL / TP
          </Text>

          {liveOrder ? (
            <>
              <View
                style={{
                  marginTop: 10,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.secondary, fontSize: 11 }}>Buy</Text>
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700' }}>
                    {buy > 0 ? formatWithDigits(buy, digits) : '--'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.secondary, fontSize: 11 }}>Sell</Text>
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700' }}>
                    {sell > 0 ? formatWithDigits(sell, digits) : '--'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.secondary, fontSize: 11 }}>Market</Text>
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700' }}>
                    {marketRef > 0 ? formatWithDigits(marketRef, digits) : '--'}
                  </Text>
                </View>
              </View>

              <View style={{ marginTop: 8 }}>
                <Text style={{ color: theme.secondary, fontSize: 11 }}>
                  Side: {isBuy ? 'BUY' : isSell ? 'SELL' : '—'} · Step: {step}
                </Text>
              </View>

              <Text style={{ color: theme.secondary, fontSize: 12, marginTop: 8 }}>
                Enter values (0 to remove).
              </Text>

              <View style={{ marginTop: 14, gap: 10 }}>
                <View>
                  <Text
                    style={{ color: theme.secondary, fontSize: 12, marginBottom: 6 }}
                  >
                    Stop Loss
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      disabled={saving}
                      onPress={() =>
                        setSlInput((prev) => adjustInputByStep(prev, step, -1, digits))
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
                      value={slInput}
                      onChangeText={(v) => {
                        setSlInput(v);
                        setUpdateError?.(null);
                      }}
                      keyboardType="decimal-pad"
                      placeholder={formatWithDigits(0, digits)}
                      placeholderTextColor={theme.secondary}
                      editable={!saving}
                      onPressIn={() => {
                        if (saving) return;
                        if (toNumberOrZero(slInput) > 0) return;
                        if (marketRef > 0) setSlInput(formatWithDigits(marketRef, digits));
                      }}
                      onFocus={() => {
                        if (saving) return;
                        if (toNumberOrZero(slInput) > 0) return;
                        if (marketRef > 0) setSlInput(formatWithDigits(marketRef, digits));
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

                    {slFieldError ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: -30,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 10,
                          backgroundColor: theme.negative + '15',
                          borderWidth: 1,
                          borderColor: theme.negative + '40',
                        }}
                      >
                        <Text style={{ color: theme.negative, fontSize: 11, fontWeight: '700' }}>
                          {slFieldError}
                        </Text>
                      </View>
                    ) : null}

                    <TouchableOpacity
                      accessibilityRole="button"
                      disabled={saving}
                      onPress={() =>
                        setSlInput((prev) => adjustInputByStep(prev, step, +1, digits))
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
                  <Text
                    style={{ color: theme.secondary, fontSize: 12, marginBottom: 6 }}
                  >
                    Take Profit
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      disabled={saving}
                      onPress={() =>
                        setTpInput((prev) => adjustInputByStep(prev, step, -1, digits))
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
                      value={tpInput}
                      onChangeText={(v) => {
                        setTpInput(v);
                        setUpdateError?.(null);
                      }}
                      keyboardType="decimal-pad"
                      placeholder={formatWithDigits(0, digits)}
                      placeholderTextColor={theme.secondary}
                      editable={!saving}
                      onPressIn={() => {
                        if (saving) return;
                        if (toNumberOrZero(tpInput) > 0) return;
                        if (marketRef > 0) setTpInput(formatWithDigits(marketRef, digits));
                      }}
                      onFocus={() => {
                        if (saving) return;
                        if (toNumberOrZero(tpInput) > 0) return;
                        if (marketRef > 0) setTpInput(formatWithDigits(marketRef, digits));
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

                    {tpFieldError ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: -30,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 10,
                          backgroundColor: theme.negative + '15',
                          borderWidth: 1,
                          borderColor: theme.negative + '40',
                        }}
                      >
                        <Text style={{ color: theme.negative, fontSize: 11, fontWeight: '700' }}>
                          {tpFieldError}
                        </Text>
                      </View>
                    ) : null}

                    <TouchableOpacity
                      accessibilityRole="button"
                      disabled={saving}
                      onPress={() =>
                        setTpInput((prev) => adjustInputByStep(prev, step, +1, digits))
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

                {isPendingOrder(liveOrder) ? (
                  <View>
                    <Text
                      style={{ color: theme.secondary, fontSize: 12, marginBottom: 6 }}
                    >
                      Remark
                    </Text>
                    <TextInput
                      value={remarkInput}
                      onChangeText={(v) => {
                        setRemarkInput(v);
                        setUpdateError?.(null);
                      }}
                      placeholder="Optional"
                      placeholderTextColor={theme.secondary}
                      editable={!saving}
                      style={[
                        styles.input,
                        {
                          color: theme.text,
                          borderColor: theme.border,
                          backgroundColor: theme.background,
                        },
                      ]}
                    />
                  </View>
                ) : null}
              </View>
            </>
          ) : null}

          {updateError ? (
            <Text style={{ marginTop: 10, color: theme.negative, fontSize: 12 }}>
              {updateError}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity
              onPress={() => onClose?.()}
              disabled={saving}
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
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onSubmit}
              disabled={saving || Boolean(slFieldError) || Boolean(tpFieldError)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: theme.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default UpdateSlTpModal;
