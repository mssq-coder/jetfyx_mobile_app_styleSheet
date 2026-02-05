import { useEffect, useState } from "react";
import { getCountries } from "../../api/getServices";
import { normalizeCountriesResponse } from "../../utils/accountSettings";

export default function useCountries() {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const data = await getCountries();
        if (!mounted) return;
        setCountries(normalizeCountriesResponse(data));
      } catch (_e) {
        // non-blocking
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return { countries, countriesLoading: loading };
}
