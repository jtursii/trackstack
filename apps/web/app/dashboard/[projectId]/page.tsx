import { redirect } from 'next/navigation'

export default function OldProjectPage({
  params,
}: {
  params: { projectId: string }
}) {
  redirect(`/dashboard/projects/${params.projectId}`)
}
