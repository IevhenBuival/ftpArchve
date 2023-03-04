import "dotenv/config";
import Client from 'ftp-ts';
import fs from 'fs';
import { cleanEnv, port, str } from "envalid";
import {program} from 'commander';

const env = cleanEnv(process.env, {
  HOST: str(),
  PORT: port(),
  FTPUSER: str(),
  PASSWORD: str(),
  BAKPATH: str()
})

const ConnectToFtp = async (host: string, user: string, password: string, port: number) => {
  try {
    return Client.connect({ host: host, user: user, password: password, port: port });
  } catch (error) {
    console.error(error);
  }
}



const GetListFtpFiles = async (ftp: Promise<Client | undefined>): Promise<string[] | undefined> => {
  try {
    const today: Date = new Date();
    const resList: string[] = [];
    await ftp.then(async (c) => {
      if (c) {
        const list = await c.list();
        list.map((file) => {
          if (typeof file !== "string") {
            if (file.size !== -1) {
              const dateDiff = (file?.date) ? (today.setHours(0, 0, 0, 0).valueOf() - file.date.setHours(0, 0, 0, 0).valueOf()) : 0;
              if (dateDiff >= 7 * 24 * 60 * 60 * 1000) {
                if (file.name.match(/\.bak/i)) c.delete(file.name);
              }
              else {
                resList.push(file?.name);
              }
            }
          }
        });
      }
    });
    return resList;
  } catch (error) {
    console.error(error);
  }
}

const getFileList = async (): Promise<string[]> => {
    const list = ( fs.readdirSync(env.BAKPATH)).filter(file => {
     if (file.match(/\.bak/i))
        return file;
    });
  list.map(file => console.log(file));
  return list;
}

const putFilesOnFtp = async (ftp: Promise<Client | undefined>, existList: string[] | undefined) => {
  const uploadList = await getFileList(); 
  try {
    await Promise.all(uploadList.map(async l => {
      const ftpuse = async (l: string) => {
        await ftp.then(
          async (c) => {
            if (c) {
              await c.put(env.BAKPATH+l, l);
            }
          }
        )
      }

      if (!existList?.find(el => el === l)) {
        await ftpuse(l);
      }
    }
    ));
  } catch (e) {
    console.error(e);
  }
}

async function main() {
  const ftp = ConnectToFtp(env.HOST, env.FTPUSER, env.PASSWORD, env.PORT);

  const ftpList = await GetListFtpFiles(ftp);

  await putFilesOnFtp(ftp, ftpList);

  
}
const command = async()=>{
  console.log("start");
     await main();
    console.log("end");
  
}


program
.version('1.0.0')
.action(command)
.parse(process.argv);

