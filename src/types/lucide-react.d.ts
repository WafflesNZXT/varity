declare module "lucide-react" {
  import * as React from "react";

  export type LucideProps = React.SVGProps<SVGSVGElement> & {
    size?: string | number;
    absoluteStrokeWidth?: boolean;
  };

  export const LogOut: React.FC<LucideProps>;
  export const Menu: React.FC<LucideProps>;
  export const MessageSquareText: React.FC<LucideProps>;
  export const Plus: React.FC<LucideProps>;
  export const Search: React.FC<LucideProps>;
  export const SendHorizontal: React.FC<LucideProps>;
  export const Settings: React.FC<LucideProps>;
  export const Sparkles: React.FC<LucideProps>;
  export const Trash2: React.FC<LucideProps>;
}
