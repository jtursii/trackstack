import { redirect } from 'next/navigation'

export default function OldCommitPage({
  params,
}: {
  params: { projectId: string; commitId: string }
}) {
  redirect(`/dashboard/projects/${params.projectId}/commit/${params.commitId}`)
}
