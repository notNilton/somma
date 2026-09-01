import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";

LocaleConfig.locales["pt-br"] = {
  monthNames: ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"],
  monthNamesShort: ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"],
  dayNames: ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"],
  dayNamesShort: ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"],
};
LocaleConfig.defaultLocale = "pt-br";

import { CustomInput } from "@/components/Input";

interface DateInputProps {
  readonly placeholder: string;
  readonly value: string;
  readonly onChangeText: (value: string) => void;
  readonly errorMessage?: string;
}

function toMarkedDate(value: string): string | null {
  if (!value) return null;
  const [day, month, year] = value.split("/");
  if (!day || !month || !year) return null;
  return `${year}-${month}-${day}`;
}

function fromMarkedDate(dateString: string): string {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

export function DateInput({ placeholder, value, onChangeText, errorMessage }: DateInputProps) {
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState<string | null>(toMarkedDate(value));

  const handleOpen = () => {
    setPending(toMarkedDate(value));
    setShow(true);
  };

  const handleConfirm = () => {
    if (pending) onChangeText(fromMarkedDate(pending));
    setShow(false);
  };

  const markedDates = pending
    ? { [pending]: { selected: true, selectedColor: "#FACC15", selectedTextColor: "#000000" } }
    : {};

  return (
    <>
      <TouchableOpacity onPress={handleOpen} activeOpacity={0.7}>
        <View pointerEvents="none">
          <CustomInput
            placeholder={placeholder}
            value={value}
            onChangeText={onChangeText}
            editable={false}
            errorMessage={errorMessage}
          />
        </View>
      </TouchableOpacity>

      <Modal visible={show} transparent animationType="fade" onRequestClose={() => setShow(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.overlay} onPress={() => setShow(false)} />

          <View style={styles.container}>
            <Calendar
              current={pending ?? undefined}
              markedDates={markedDates}
              onDayPress={(day) => setPending(day.dateString)}
              theme={{
                calendarBackground: "#1a1a1a",
                textSectionTitleColor: "#555555",
                selectedDayBackgroundColor: "#FACC15",
                selectedDayTextColor: "#000000",
                todayTextColor: "#FACC15",
                dayTextColor: "#ffffff",
                textDisabledColor: "#444444",
                dotColor: "#FACC15",
                arrowColor: "#FACC15",
                monthTextColor: "#ffffff",
                textDayFontFamily: "Inter_400Regular",
                textMonthFontFamily: "Inter_600SemiBold",
                textDayHeaderFontFamily: "Inter_600SemiBold",
                textDayFontSize: 14,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 11,
              }}
            />

            <View style={styles.actions}>
              <TouchableOpacity onPress={() => setShow(false)} style={styles.cancelBtn} activeOpacity={0.7}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirm} style={styles.confirmBtn} activeOpacity={0.7}>
                <Text style={styles.confirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  container: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: "#2a2a2a",
    paddingBottom: 36,
    overflow: "hidden",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  confirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#FACC15",
  },
  cancelText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#888888",
  },
  confirmText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#000000",
  },
});
