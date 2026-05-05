import {
    JSONFilePreset as createJSONFile,
} from "lowdb/node";

interface DataSchema {
    lastStartedAt?: string;
    lastStartedBy?: string;
    commandRevisions: {
        [snowflakeId: string]: number;
    };
}

const defaultData: DataSchema = {
    commandRevisions: {},
};

const filename = process.env.LOWDB_FILENAME || "state.json";
export const db = await createJSONFile(filename, defaultData);
