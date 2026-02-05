import { useEffect, useMemo, useState } from "react";
import { getInitialAccountSettingsForm } from "../../utils/accountSettings";

export default function useAccountSettingsForm(user) {
  const initial = useMemo(
    () => getInitialAccountSettingsForm(user || {}),
    [user],
  );

  const [initialized, setInitialized] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [dobText, setDobText] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateProv, setStateProv] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");
  const [gender, setGender] = useState("");
  const [income, setIncome] = useState("");
  const [interests, setInterests] = useState([]);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (initialized) return;

    setFirstName(initial.firstName);
    setLastName(initial.lastName);
    setMobileNumber(initial.mobileNumber);
    setDobText(initial.dobText);
    setStreet(initial.street);
    setCity(initial.city);
    setStateProv(initial.stateProv);
    setZip(initial.zip);
    setCountry(initial.country);
    setGender(initial.gender);
    setIncome(initial.income);
    setInterests(initial.interests);
    setComment(initial.comment);

    setInitialized(true);
  }, [initialized, initial]);

  return {
    initialized,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    mobileNumber,
    setMobileNumber,
    dobText,
    setDobText,
    street,
    setStreet,
    city,
    setCity,
    stateProv,
    setStateProv,
    zip,
    setZip,
    country,
    setCountry,
    gender,
    setGender,
    income,
    setIncome,
    interests,
    setInterests,
    comment,
    setComment,
  };
}
