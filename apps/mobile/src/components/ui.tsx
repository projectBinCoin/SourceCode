import { Pressable, Text, View, TextInput, type PressableProps } from "react-native";
import { useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react-native";

type Variant = "default" | "outline" | "ghost" | "destructive" | "secondary";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  default: "bg-primary active:opacity-80",
  outline: "border border-border bg-card active:bg-muted",
  ghost: "active:bg-muted",
  destructive: "bg-destructive active:opacity-80",
  secondary: "bg-secondary active:opacity-80",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function Button({
  variant = "default",
  size = "md",
  className = "",
  children,
  ...props
}: PressableProps & { variant?: Variant; size?: Size }) {
  return (
    <Pressable
      className={`flex-row items-center justify-center gap-2 rounded-xl font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </Pressable>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <View className={`rounded-2xl border border-border bg-card ${className}`}>{children}</View>
  );
}

export function CardHeader({ className = "", children }: { className?: string; children: ReactNode }) {
  return <View className={`gap-1 p-4 pb-2 ${className}`}>{children}</View>;
}

export function CardTitle({ className = "", children }: { className?: string; children: ReactNode }) {
  return <Text className={`text-base font-semibold text-foreground ${className}`}>{children}</Text>;
}

export function CardDescription({ className = "", children }: { className?: string; children: ReactNode }) {
  return <Text className={`text-sm text-muted-foreground ${className}`}>{children}</Text>;
}

export function CardContent({ className = "", children }: { className?: string; children: ReactNode }) {
  return <View className={`p-4 pt-2 ${className}`}>{children}</View>;
}

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

export function Badge({
  variant = "default",
  className = "",
  children,
}: {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
}) {
  const styles: Record<BadgeVariant, string> = {
    default: "bg-primary/10 border-transparent text-primary",
    secondary: "bg-secondary border-transparent text-secondary-foreground",
    outline: "border border-border text-muted-foreground",
    destructive: "bg-destructive/10 border-transparent text-destructive",
  };
  return (
    <View className={`self-start rounded-full border px-2.5 py-0.5 ${styles[variant]} ${className}`}>
      <Text className="text-xs font-medium">{children}</Text>
    </View>
  );
}

export function Label({ className = "", children }: { className?: string; children: ReactNode }) {
  return <Text className={`text-sm font-medium text-foreground ${className}`}>{children}</Text>;
}

export function Input({ className = "", ...props }: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor="#8fa3b8"
      className={`h-11 w-full rounded-xl border border-border bg-card px-3 text-base text-foreground ${className}`}
      {...props}
    />
  );
}

/** Input with a leading icon. The icon renders after the input so Android's
 * opaque input background never paints over it. */
export function IconInput({
  icon,
  className = "",
  ...props
}: React.ComponentProps<typeof TextInput> & { icon: ReactNode }) {
  return (
    <View className="w-full">
      <TextInput
        placeholderTextColor="#8fa3b8"
        className={`h-11 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-base text-foreground ${className}`}
        {...props}
      />
      <View pointerEvents="none" className="absolute left-3 top-1/2 -translate-y-1/2">
        {icon}
      </View>
    </View>
  );
}

export function PasswordInput({
  icon,
  className = "",
  ...props
}: React.ComponentProps<typeof TextInput> & { icon?: ReactNode }) {
  const [visible, setVisible] = useState(false);
  return (
    <View className="w-full">
      <TextInput
        secureTextEntry={!visible}
        placeholderTextColor="#8fa3b8"
        className={`h-11 w-full rounded-xl border border-border bg-card pl-10 pr-10 text-base text-foreground ${className}`}
        {...props}
      />
      <View pointerEvents="none" className="absolute left-3 top-1/2 -translate-y-1/2">
        {icon}
      </View>
      <Pressable
        onPress={() => setVisible((v) => !v)}
        accessibilityLabel={visible ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
      >
        {visible ? (
          <EyeOff size={18} color="#8fa3b8" />
        ) : (
          <Eye size={18} color="#8fa3b8" />
        )}
      </Pressable>
    </View>
  );
}

export function Textarea({ className = "", ...props }: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      multiline
      placeholderTextColor="#8fa3b8"
      className={`min-h-24 w-full rounded-xl border border-border bg-card px-3 py-2 text-base text-foreground ${className}`}
      {...props}
    />
  );
}

