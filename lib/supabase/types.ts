// Auto-generated Database typings will replace this file later.
// For now we expose a permissive type so client/server helpers compile.
// To generate real types: `supabase gen types typescript --linked > lib/supabase/types.ts`

/* eslint-disable @typescript-eslint/no-explicit-any */

export type Database = {
  public: {
    Tables: {
      [key: string]: {
        Row: { [k: string]: any };
        Insert: { [k: string]: any };
        Update: { [k: string]: any };
        Relationships: never[];
      };
    };
    Views: {
      [key: string]: {
        Row: { [k: string]: any };
        Relationships: never[];
      };
    };
    Functions: {
      [key: string]: {
        Args: { [k: string]: any };
        Returns: any;
      };
    };
    Enums: { [key: string]: string };
    CompositeTypes: { [key: string]: { [k: string]: any } };
  };
};
