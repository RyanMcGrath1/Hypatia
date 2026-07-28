/**
 * @vitest-environment jsdom
 */
import {
  createElement,
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => {
  const React = require("react") as typeof import("react");

  const View = ({
    children,
    accessibilityRole,
    accessibilityLabel,
    accessibilityState,
    accessibilityLiveRegion,
    testID,
    style,
  }: {
    children?: ReactNode;
    accessibilityRole?: string;
    accessibilityLabel?: string;
    accessibilityState?: { disabled?: boolean; busy?: boolean };
    accessibilityLiveRegion?: string;
    testID?: string;
    style?: unknown;
  }) =>
    React.createElement(
      "div",
      {
        "data-testid": testID,
        "aria-label": accessibilityLabel,
        "aria-disabled": accessibilityState?.disabled ? true : undefined,
        "aria-busy": accessibilityState?.busy ? true : undefined,
        "aria-live": accessibilityLiveRegion,
        role: accessibilityRole,
        "data-style": JSON.stringify(style ?? null),
      },
      children,
    );

  const Text = ({
    children,
    accessibilityRole,
    accessibilityLiveRegion,
    style,
  }: {
    children?: ReactNode;
    accessibilityRole?: string;
    accessibilityLiveRegion?: string;
    style?: unknown;
  }) =>
    React.createElement(
      "span",
      {
        role: accessibilityRole,
        "aria-live": accessibilityLiveRegion,
        "data-style": JSON.stringify(style ?? null),
      },
      children,
    );

  const TextInput = forwardRef<
    HTMLInputElement,
    InputHTMLAttributes<HTMLInputElement> & {
      onChangeText?: (text: string) => void;
      placeholderTextColor?: string;
      secureTextEntry?: boolean;
      editable?: boolean;
      accessibilityLabel?: string;
      accessibilityState?: { disabled?: boolean };
      style?: unknown;
      autoCapitalize?: string;
      autoCorrect?: boolean;
      textContentType?: string;
      autoComplete?: string;
      returnKeyType?: string;
      keyboardType?: string;
    }
  >(function MockTextInput(
    {
      onChangeText,
      value,
      placeholder,
      editable = true,
      secureTextEntry,
      accessibilityLabel,
      accessibilityState,
      style,
      autoCapitalize,
      autoCorrect,
      textContentType,
      autoComplete,
      returnKeyType,
      keyboardType,
    },
    ref,
  ) {
    return React.createElement("input", {
      ref,
      value: value ?? "",
      placeholder,
      type: secureTextEntry ? "password" : "text",
      disabled: editable === false,
      "aria-label": accessibilityLabel,
      "aria-disabled":
        accessibilityState?.disabled || editable === false ? true : undefined,
      "data-style": JSON.stringify(style ?? null),
      "data-autocapitalize": autoCapitalize,
      "data-autocorrect":
        autoCorrect === undefined ? undefined : String(autoCorrect),
      "data-text-content-type": textContentType,
      "data-autocomplete": autoComplete,
      "data-return-key-type": returnKeyType,
      "data-keyboard-type": keyboardType,
      "data-secure": secureTextEntry ? "true" : "false",
      onChange: (e: { target: { value: string } }) => {
        onChangeText?.(e.target.value);
      },
    });
  });

  const Pressable = ({
    children,
    onPress,
    disabled,
    accessibilityRole,
    accessibilityLabel,
    accessibilityState,
    style,
  }: {
    children?: ReactNode | ((state: { pressed: boolean }) => ReactNode);
    onPress?: () => void;
    disabled?: boolean;
    accessibilityRole?: string;
    accessibilityLabel?: string;
    accessibilityState?: { disabled?: boolean; busy?: boolean };
    style?: unknown | ((state: { pressed: boolean }) => unknown);
  }) => {
    const resolvedStyle =
      typeof style === "function" ? style({ pressed: false }) : style;
    const content =
      typeof children === "function" ? children({ pressed: false }) : children;
    return React.createElement(
      "button",
      {
        type: "button",
        disabled: !!disabled,
        "aria-label": accessibilityLabel,
        "aria-disabled":
          accessibilityState?.disabled || disabled ? true : undefined,
        "aria-busy": accessibilityState?.busy ? true : undefined,
        role: accessibilityRole ?? "button",
        "data-style": JSON.stringify(resolvedStyle ?? null),
        onClick: () => {
          if (!disabled) {
            onPress?.();
          }
        },
      } as ButtonHTMLAttributes<HTMLButtonElement>,
      content,
    );
  };

  const ActivityIndicator = ({ color }: { color?: string }) =>
    React.createElement("div", {
      role: "progressbar",
      "data-testid": "activity-indicator",
      "data-color": color,
    });

  return {
    View,
    Text,
    TextInput,
    Pressable,
    ActivityIndicator,
    StyleSheet: {
      create: <T,>(styles: T) => styles,
      hairlineWidth: 1,
    },
    Platform: {
      OS: "web",
      select: (spec: Record<string, unknown>) =>
        spec.web ?? spec.default ?? spec.native,
    },
  };
});

vi.mock("@expo/vector-icons/Feather", () => ({
  default: ({ name }: { name: string }) =>
    createElement("span", { "data-testid": `icon-${name}` }, name),
}));

vi.mock("@/hooks/useColorScheme", () => ({
  useColorScheme: () => "light",
}));

import { FormButton } from "@/components/forms/FormButton";
import { FormNotice } from "@/components/forms/FormNotice";
import { FormTextField } from "@/components/forms/FormTextField";
import { PasswordField } from "@/components/forms/PasswordField";
import { Brand, Palette, getThemeInteractive } from "@/constants/theme/Colors";
import { getSemanticColors } from "@/constants/theme/ThemeTokens";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("FormTextField", () => {
  it("renders label, value, placeholder, and helper text", () => {
    render(
      <FormTextField
        label="Email"
        value="user@example.com"
        onChangeText={() => {}}
        placeholder="you@example.com"
        helperText="We never share your email"
      />,
    );

    expect(screen.getByText("Email")).toBeTruthy();
    expect(screen.getByDisplayValue("user@example.com")).toBeTruthy();
    expect(screen.getByPlaceholderText("you@example.com")).toBeTruthy();
    expect(screen.getByText("We never share your email")).toBeTruthy();
  });

  it("forwards onChangeText", () => {
    const onChangeText = vi.fn();
    render(
      <FormTextField label="Name" value="" onChangeText={onChangeText} />,
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Ada" },
    });
    expect(onChangeText).toHaveBeenCalledWith("Ada");
  });

  it("displays error text and applies error border color", () => {
    const semantic = getSemanticColors("light");
    const { container } = render(
      <FormTextField
        label="Email"
        value="bad"
        onChangeText={() => {}}
        error="Enter a valid email"
      />,
    );

    expect(screen.getByText("Enter a valid email")).toBeTruthy();
    expect(screen.queryByText("We never share your email")).toBeNull();

    const shell = Array.from(container.querySelectorAll("[data-style]")).find(
      (el) => {
        const style = el.getAttribute("data-style") ?? "";
        return style.includes(semantic.danger);
      },
    );
    expect(shell).toBeTruthy();
  });

  it("disables the input when disabled", () => {
    render(
      <FormTextField
        label="Email"
        value="x"
        onChangeText={() => {}}
        disabled
      />,
    );
    const input = screen.getByLabelText("Email") as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(input.getAttribute("aria-disabled")).toBe("true");
  });

  it("forwards standard TextInput props", () => {
    render(
      <FormTextField
        label="Email"
        value=""
        onChangeText={() => {}}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
      />,
    );
    const input = screen.getByLabelText("Email");
    expect(input.getAttribute("data-keyboard-type")).toBe("email-address");
    expect(input.getAttribute("data-autocapitalize")).toBe("none");
    expect(input.getAttribute("data-autocomplete")).toBe("email");
    expect(input.getAttribute("data-text-content-type")).toBe("emailAddress");
    expect(input.getAttribute("data-return-key-type")).toBe("next");
  });
});

describe("PasswordField", () => {
  it("is secure by default and toggles visibility without changing value", () => {
    const onChangeText = vi.fn();
    const password = "  ExactPass!  ";
    render(
      <PasswordField
        label="Password"
        value={password}
        onChangeText={onChangeText}
      />,
    );

    const input = screen.getByLabelText("Password") as HTMLInputElement;
    expect(input.getAttribute("data-secure")).toBe("true");
    expect(input.type).toBe("password");
    expect(input.value).toBe(password);

    const toggle = screen.getByRole("button", { name: "Show password" });
    fireEvent.click(toggle);

    expect(input.getAttribute("data-secure")).toBe("false");
    expect(input.type).toBe("text");
    expect(input.value).toBe(password);
    expect(onChangeText).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Hide password" }),
    ).toBeTruthy();
  });

  it("supports error and helper text", () => {
    const { rerender } = render(
      <PasswordField
        value=""
        onChangeText={() => {}}
        helperText="Use a strong password"
      />,
    );
    expect(screen.getByText("Use a strong password")).toBeTruthy();

    rerender(
      <PasswordField
        value=""
        onChangeText={() => {}}
        error="Password is required"
      />,
    );
    expect(screen.getByText("Password is required")).toBeTruthy();
  });

  it("passes through current/new password metadata", () => {
    const { rerender } = render(
      <PasswordField
        value=""
        onChangeText={() => {}}
        textContentType="password"
        autoComplete="current-password"
      />,
    );
    let input = screen.getByLabelText("Password");
    expect(input.getAttribute("data-text-content-type")).toBe("password");
    expect(input.getAttribute("data-autocomplete")).toBe("current-password");

    rerender(
      <PasswordField
        value=""
        onChangeText={() => {}}
        textContentType="newPassword"
        autoComplete="new-password"
      />,
    );
    input = screen.getByLabelText("Password");
    expect(input.getAttribute("data-text-content-type")).toBe("newPassword");
    expect(input.getAttribute("data-autocomplete")).toBe("new-password");
  });
});

describe("FormButton", () => {
  it("renders label and calls onPress", () => {
    const onPress = vi.fn();
    render(<FormButton label="Log In" onPress={onPress} />);
    fireEvent.click(screen.getByRole("button", { name: "Log In" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not activate when disabled", () => {
    const onPress = vi.fn();
    render(<FormButton label="Log In" onPress={onPress} disabled />);
    const button = screen.getByRole("button", { name: "Log In" });
    expect(button).toHaveProperty("disabled", true);
    fireEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("shows loading indicator and blocks repeated presses", () => {
    const onPress = vi.fn();
    render(<FormButton label="Log In" onPress={onPress} isLoading />);
    expect(screen.getByTestId("activity-indicator")).toBeTruthy();
    expect(screen.queryByText("Log In")).toBeNull();
    const button = screen.getByRole("button", { name: "Log In" });
    expect(button.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("applies primary and destructive fills from theme tokens", () => {
    const interactive = getThemeInteractive("light");
    const { rerender } = render(
      <FormButton label="Save" onPress={() => {}} variant="primary" />,
    );
    let button = screen.getByRole("button", { name: "Save" });
    expect(button.getAttribute("data-style") ?? "").toContain(
      interactive.primaryFill,
    );

    rerender(
      <FormButton label="Delete" onPress={() => {}} variant="destructive" />,
    );
    button = screen.getByRole("button", { name: "Delete" });
    expect(button.getAttribute("data-style") ?? "").toContain(
      interactive.danger,
    );
  });
});

describe("FormNotice", () => {
  it("renders error, success, and info messages", () => {
    const { rerender } = render(
      <FormNotice tone="error" message="Invalid email or password" />,
    );
    expect(screen.getByText("Error")).toBeTruthy();
    expect(screen.getByText("Invalid email or password")).toBeTruthy();

    rerender(
      <FormNotice tone="success" message="Password changed successfully" />,
    );
    expect(screen.getByText("Success")).toBeTruthy();
    expect(screen.getByText("Password changed successfully")).toBeTruthy();

    rerender(<FormNotice tone="info" message="Check your inbox" />);
    expect(screen.getByText("Notice")).toBeTruthy();
    expect(screen.getByText("Check your inbox")).toBeTruthy();
  });

  it("uses theme semantic colors for tones", () => {
    const interactive = getThemeInteractive("light");
    const { container, rerender } = render(
      <FormNotice tone="error" message="Nope" />,
    );
    expect(container.innerHTML).toContain(interactive.dangerSoft);

    rerender(<FormNotice tone="success" message="Ok" />);
    expect(container.innerHTML).toContain(Palette.successSoft);
    expect(container.innerHTML).toContain(Brand.success);

    rerender(<FormNotice tone="info" message="FYI" />);
    expect(container.innerHTML).toContain(interactive.infoSoft);
  });

  it("allows a custom title", () => {
    render(
      <FormNotice
        tone="error"
        title="Unable to create account"
        message="Try again later"
      />,
    );
    expect(screen.getByText("Unable to create account")).toBeTruthy();
    expect(screen.getByText("Try again later")).toBeTruthy();
  });
});

describe("form components separation", () => {
  it("does not import auth, session, API, or router modules", () => {
    const files = [
      "FormTextField.tsx",
      "PasswordField.tsx",
      "FormButton.tsx",
      "FormNotice.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(
        resolve(__dirname, `../../../components/forms/${file}`),
        "utf8",
      );
      expect(source).not.toMatch(/authApi/);
      expect(source).not.toMatch(/useAuthSession/);
      expect(source).not.toMatch(/AuthProvider/);
      expect(source).not.toMatch(/tokenStorage/);
      expect(source).not.toMatch(/requestApi/);
      expect(source).not.toMatch(/expo-router/);
    }
  });
});
