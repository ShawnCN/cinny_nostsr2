import { Buffer } from 'buffer';
import * as bech32 from 'bech32-buffer'; /* eslint-disable-line @typescript-eslint/no-var-requires */
import { Debounce } from './common';
import { sha256 } from '@noble/hashes/sha256';
export const toNostrBech32Address = (address: string, prefix: string) => {
  if (!prefix) {
    throw new Error('prefix is required');
  }
  try {
    const decoded = bech32.decode(address);
    if (prefix !== decoded.prefix) {
      return null;
    }
    return bech32.encode(prefix, decoded.data);
  } catch (e) {
    // not a bech32 address
  }
  if (address.match(/^[0-9a-fA-F]{64}$/)) {
    const words = Buffer.from(address, 'hex');
    return bech32.encode(prefix, words);
  }
  return null;
};
export const toNostrHexAddress = (str: string): string | null => {
  if (str.match(/^[0-9a-fA-F]{64}$/)) {
    return str;
  }
  try {
    const { data } = bech32.decode(str);
    const addr = arrayToHex(data);
    return addr;
  } catch (e) {
    // not a bech32 address
  }
  return null;
};
function arrayToHex(array: any) {
  return Array.from(array, (byte: any) => {
    return ('0' + (byte & 0xff).toString(16)).slice(-2);
  }).join('');
}

export const defaultName = (address: string, prefix: string) => {
  return toNostrBech32Address(address, prefix)?.slice(5, 8);
};

export const getSubscriptionIdForName = (name: string) => {
  return arrayToHex(sha256(name)).slice(0, 8);
};

const getBase64 = (file: Blob): Promise<string | ArrayBuffer | null> => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  return new Promise((resolve, reject) => {
    reader.onload = function () {
      resolve(reader.result);
    };
    reader.onerror = function (error) {
      reject(`Error: ${error}`);
    };
  });
};

export const attachmentsChanged = (file) => {
  // let files = event.target.files || event.dataTransfer.files;
  console.log(`Attachment`, file);
  const files = [file];
  if (files) {
    for (let i = 0; i < files.length; i++) {
      let formData = new FormData();
      formData.append('fileToUpload', files[i]);

      let a = [] as any[];
      a[i] = a[i] || {
        type: files[i].type,
      };

      getBase64(files[i]).then((base64) => {
        a[i].data = base64;
      });

      const url = fetch('https://nostr.build/upload.php', {
        method: 'POST',
        body: formData,
      })
        .then(async (response) => {
          const text = await response.text();
          const url = text.match(
            /https:\/\/nostr\.build\/(?:i|av)\/nostr\.build_[a-z0-9]{64}\.[a-z0-9]+/i
          );
          if (url) {
            return url;
            // a[i].url = url[0];
            // this.setState({ attachments: a });
            // const textEl = $(this.newMsgRef.current);
            // const currentVal = textEl.val();
            // if (currentVal) {
            //   textEl.val(currentVal + '\n\n' + url[0]);
            // } else {
            //   textEl.val(url[0]);
            // }
          }
        })
        .catch((error) => {
          console.error('upload error', error);
          a[i].error = 'upload failed';
          this.setState({ attachments: a });
        });
      console.log(url);
      return url;
    }
  }
};

const imgRegex =
  /\b(https?:\/\/\S+(?:\.png|\.jpe?g|\.gif|\.webp|\.PNG|\.JPE?G|\.GIF|\.WEBP)\S*)\b/g;

export const contectDetect = (c: string) => {
  let imgs: string[] = [];
  if (c.match(imgRegex)) {
    c = c.replace(imgRegex, (img) => {
      imgs.unshift(img);
      return '';
    });
  }
  return { text: c, imgs: imgs };
};
