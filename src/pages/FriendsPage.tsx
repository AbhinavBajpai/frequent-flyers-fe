import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { authApi, friendsApi } from '../api/client'

export function FriendsPage() {
  const { token } = useParams()
  const cache = useQueryClient()
  const account = useQuery({ queryKey: ['account'], queryFn: authApi.me, retry: false })
  const friends = useQuery({ queryKey: ['friends'], queryFn: friendsApi.list, enabled: Boolean(account.data), retry: false })
  const invite = useMutation({ mutationFn: friendsApi.createInvite })
  const accept = useMutation({ mutationFn: () => friendsApi.acceptInvite(token!), onSuccess: () => cache.invalidateQueries({ queryKey: ['friends'] }) })
  const inviteUrl = invite.data ? `${window.location.origin}/friends/invite/${invite.data.invite.token}` : null

  if (account.isPending) return <section className="utility-page friends-page"><p role="status">Checking your account…</p></section>
  if (!account.data) return <section className="utility-page friends-page"><p className="eyebrow">Friends</p><h1>Log in first</h1><p className="lede">You need an account to add friends and compare completed challenges.</p><Link className="text-action" to="/account">Log in or sign up</Link></section>

  return <section className="utility-page friends-page">
    <p className="eyebrow">Your connections</p><h1>Friends</h1><p className="lede">Friend results are only revealed after you have both completed the same challenge.</p>
    {token && <div className="friends-card"><h2>Friend invitation</h2>{accept.isSuccess ? <p>You’re now friends with <strong>{accept.data.friend.email}</strong>.</p> : <button className="primary-action" disabled={accept.isPending} onClick={() => accept.mutate()}>{accept.isPending ? 'Accepting…' : 'Accept invitation'}</button>}{accept.isError && <p className="inline-error" role="alert">{accept.error.message}</p>}</div>}
    <div className="friends-grid">
      <div className="friends-card"><h2>Invite a friend</h2><p>Create a private link that expires in seven days.</p><button className="primary-action" disabled={invite.isPending} onClick={() => invite.mutate()}>{invite.isPending ? 'Creating…' : 'Create invite link'}</button>{inviteUrl && <><input aria-label="Friend invite link" readOnly value={inviteUrl} /><button className="secondary-button" onClick={() => navigator.clipboard?.writeText(inviteUrl)}>Copy link</button></>}</div>
      <div className="friends-card"><h2>Your friends</h2>{friends.isPending && <p role="status">Loading friends…</p>}{friends.data?.friends.length === 0 && <p>No friends added yet.</p>}<ul className="friend-list">{friends.data?.friends.map((friend) => <li key={friend.id}>{friend.email}</li>)}</ul></div>
    </div>
  </section>
}
