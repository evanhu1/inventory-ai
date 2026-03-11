import { PublicInventoryPage } from '@/components/PublicInventoryPage'

export default async function Page({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  return <PublicInventoryPage username={username} />
}
