import { redirect } from 'next/navigation';

export default async function AdminHome() {
  redirect('/admin/guides');
}
