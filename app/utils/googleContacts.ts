  // utils/googleContacts.ts

import { serializeBirthday } from './birthday.ts';

export interface Contact {
  resourceName: string;
  etag?: string;
  displayName: string;
  givenName?: string;
  familyName?: string;
  phoneNumbers?: string[];
  emailAddresses?: string[];
  addresses?: string[]; // Isso será texto combinado (ex: rua, cidade, estado)
  birthday?: string; // YYYY-MM-DD ou --MM-DD
  notes?: string;
  urls?: string[];
}

export async function fetchAllContacts(accessToken: string): Promise<any[]> {
  let allContacts: any[] = [];
  let nextPageToken: string | undefined = undefined;

  do {
    const fields = 'names,emailAddresses,phoneNumbers,birthdays,addresses,urls,biographies';
    const response: Response = await fetch(`https://people.googleapis.com/v1/people/me/connections?personFields=${fields}&pageSize=1000${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data: { connections?: any[]; nextPageToken?: string } = await response.json();
    if (data.connections) {
      allContacts = [...allContacts, ...data.connections];
    }
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  return allContacts;
}


export function parseGoogleContact(entry: any): Contact {
  const name = entry.names?.[0];
  const email = entry.emailAddresses?.[0]?.value || '';
  const phone = entry.phoneNumbers?.[0]?.value || '';
  const birthdayDate = entry.birthdays?.[0]?.date;
  const address = entry.addresses?.[0];
  const urlList = entry.urls?.map((url: any) => url.value) || [];
  const note = entry.biographies?.[0]?.value || '';

  return {
    resourceName: entry.resourceName,
    etag: entry.etag,
    displayName: name?.displayName || '',
    givenName: name?.givenName,
    familyName: name?.familyName,
    phoneNumbers: entry.phoneNumbers?.map((p: any) => p.value),
    emailAddresses: entry.emailAddresses?.map((e: any) => e.value),
    birthday: birthdayDate
      ? serializeBirthday({
        day: Number(birthdayDate.day),
        month: Number(birthdayDate.month),
        ...(Number(birthdayDate.year) > 0 ? { year: Number(birthdayDate.year) } : {}),
      }) || undefined
      : undefined,
    addresses: address ? [`${address.streetAddress || ''}, ${address.city || ''}, ${address.region || ''}, ${address.postalCode || ''}`.trim()] : [],
    notes: note,
    urls: urlList
  };
}
