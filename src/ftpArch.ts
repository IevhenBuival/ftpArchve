import "dotenv/config";
import Client from 'ftp-ts';
import fs from 'fs';
import { cleanEnv, port, str } from "envalid";
import { program } from 'commander';

const env = cleanEnv(process.env, {
  HOST: str(),
  PORT: port(),
  FTPUSER: str(),
  PASSWORD: str(),
  BAKPATH: str()
})

const ConnectToFtp = async (host: string, user: string, password: string, port: number) => {
  try {
    return await Client.connect({ host: host, user: user, password: password, port: port });
  } catch (error) {
    console.error(error);
  }
}

const GetListFtpFiles = async (ftp: Client): Promise<string[] | undefined> => {
  try {
    const today: Date = new Date();
    const resList: string[] = [];
    const list = await ftp.list();
    list.map((file) => {
      if (typeof file !== "string") {
        if (file.size !== -1) {
          const dateDiff = (file?.date) ? (today.setHours(0, 0, 0, 0).valueOf() - file.date.setHours(0, 0, 0, 0).valueOf()) : 0;
          if (dateDiff >= 7 * 24 * 60 * 60 * 1000) {
            if (file.name.match(/\.bak/i)) ftp.delete(file.name);
          }
          else {
            resList.push(file?.name);
          }
        }
      }
    })
    return resList;
  } catch (error) {
    console.error(error);
  }
}

const getFileList = async (): Promise<string[]> => {
  const list = (fs.readdirSync(env.BAKPATH)).filter(file => {
    if (file.match(/\.bak/i))
      return file;
  });
  list.map(file => console.log(file));
  return list;
}

const putFilesOnFtp = async (ftp: Client) => {
  try {
    const ftpList = GetListFtpFiles(ftp);
    const uploadList = getFileList();
    const finalLists = [await ftpList, await uploadList];

    if (finalLists[1]) {
      await Promise.all(finalLists[1].map(async l => {
        const ftpuse = async (l: string) => {
          await ftp.put(env.BAKPATH + l, l);
        };
        if (finalLists[0]) {
          if (!finalLists[0].find(el => el === l)) {
            await ftpuse(l);
          };
        }
      }));
    }
  } catch (e) {
    console.error(e);
  }
}

async function main() {
  const ftp = await ConnectToFtp(env.HOST, env.FTPUSER, env.PASSWORD, env.PORT);
  if (ftp)
    await putFilesOnFtp(ftp);
}

const command = async () => {
  console.log("start");
  await main();
  console.log("end");

}

program
  .version('1.0.0')
  .action(command)
  .parse(process.argv);

