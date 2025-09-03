// src/shared/components/DynamicIcon.tsx

import React from "react";
import * as LucideIcons from "lucide-react";

export type IconName = keyof typeof LucideIcons;

interface DynamicIconProps {
  name: IconName;
  size?: number;
  className?: string;
  color?: string;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({
  name,
  size = 24,
  className = "",
  color = "currentColor",
}) => {
  const IconComponent = LucideIcons[name] as React.ComponentType<{
    size?: number;
    className?: string;
    color?: string;
  }>;

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return (
      <LucideIcons.HelpCircle size={size} className={className} color={color} />
    );
  }

  return <IconComponent size={size} className={className} color={color} />;
};
