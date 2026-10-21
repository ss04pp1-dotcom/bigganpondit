import { defineConfig } from "eslint/config";
import next from "eslint-config-next";

export default defineConfig([{
    extends: [...next],
    rules: {
        "react-hooks/set-state-in-effect": "off",
        "react-hooks/purity": "off",
        "react-hooks/immutability": "off",
        "react-hooks/preserve-manual-memoization": "off",
        "react/no-unescaped-entities": "off",
        "@next/next/no-img-element": "warn"
    }
}]);
