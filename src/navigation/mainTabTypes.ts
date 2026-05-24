export type MainTabParamList = {
  Home:
    | {
        categoryId?: string;
        regionId?: string;
        aiPrompt?: string;
      }
    | undefined;
  Chat: undefined;
  Category: undefined;
  Profile: undefined;
};
