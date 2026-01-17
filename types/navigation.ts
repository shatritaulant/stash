import { Save } from './index';
import { NavigatorScreenParams } from '@react-navigation/native';

export type RootTabParamList = {
    Links: undefined;
    Collections: undefined;
    Account: undefined;
};

export type RootStackParamList = {
    Home: NavigatorScreenParams<RootTabParamList>;
    Library: undefined; // Keeping for now if needed, but Home replaces it as root
    Add: { url?: string } | undefined;
    Account: undefined;
    Detail: { saveId: number; save?: Save };
    Edit: { save: Save };
    CollectionDetail: { collectionId: number; name: string };
};
