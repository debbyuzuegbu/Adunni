export type GroupStatus = 'draft' | 'active' | 'completed' | 'cancelled'
export type ContributionFrequency = 'weekly' | 'monthly'
export type ContributionStatus = 'pending' | 'paid' | 'failed'
export type PaymentMethod = 'wallet' | 'bank_transfer'

export type Profile = {
  id: string
  full_name: string
  phone: string | null
  wallet_balance_kobo: number
  avatar_url: string | null
  email_reminders: boolean
  created_at: string
}

export type NotificationKind =
  | 'due_soon'
  | 'overdue'
  | 'member_paid'
  | 'payout_upcoming'
  | 'payout_received'
  | 'circle_started'
  | 'member_joined'

export type AppNotification = {
  id: string
  profile_id: string
  kind: NotificationKind
  title: string
  body: string
  group_id: string | null
  dedupe_key: string | null
  read_at: string | null
  emailed_at: string | null
  created_at: string
}

export type Group = {
  id: string
  name: string
  created_by: string
  contribution_amount_kobo: number
  frequency: ContributionFrequency
  member_count: number
  status: GroupStatus
  current_cycle: number
  payout_order_locked: boolean
  invite_code: string | null
  created_at: string
}

export type GroupMember = {
  id: string
  group_id: string
  profile_id: string
  payout_position: number | null
  joined_at: string
}

export type Cycle = {
  id: string
  group_id: string
  cycle_number: number
  recipient_member_id: string
  due_date: string
  paid_out: boolean
  created_at: string
}

export type Contribution = {
  id: string
  cycle_id: string
  member_id: string
  amount_kobo: number
  method: PaymentMethod | null
  status: ContributionStatus
  paid_at: string | null
  reference: string | null
}

export type WalletTransactionKind = 'top_up' | 'contribution' | 'payout'

export type WalletTransaction = {
  id: string
  profile_id: string
  kind: WalletTransactionKind
  amount_kobo: number
  balance_after_kobo: number
  reference: string
  description: string
  group_id: string | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string; full_name: string }
        Update: Partial<Profile>
        Relationships: []
      }
      groups: {
        Row: Group
        Insert: Partial<Group> & {
          name: string
          created_by: string
          contribution_amount_kobo: number
          frequency: ContributionFrequency
          member_count: number
        }
        Update: Partial<Group>
        Relationships: []
      }
      group_members: {
        Row: GroupMember
        Insert: Partial<GroupMember> & { group_id: string; profile_id: string }
        Update: Partial<GroupMember>
        Relationships: [
          {
            foreignKeyName: 'group_members_group_id_fkey'
            columns: ['group_id']
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'group_members_profile_id_fkey'
            columns: ['profile_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      cycles: {
        Row: Cycle
        Insert: Partial<Cycle> & {
          group_id: string
          cycle_number: number
          recipient_member_id: string
          due_date: string
        }
        Update: Partial<Cycle>
        Relationships: []
      }
      contributions: {
        Row: Contribution
        Insert: Partial<Contribution> & { cycle_id: string; member_id: string; amount_kobo: number }
        Update: Partial<Contribution>
        Relationships: []
      }
      wallet_transactions: {
        Row: WalletTransaction
        Insert: never
        Update: never
        Relationships: []
      }
      notifications: {
        Row: AppNotification
        Insert: never
        Update: { read_at?: string | null }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      join_group_by_invite_code: {
        Args: { code: string }
        Returns: Group
      }
      leave_group: {
        Args: { target_group: string }
        Returns: undefined
      }
      remove_member: {
        Args: { target_member: string }
        Returns: undefined
      }
      move_member: {
        Args: { target_member: string; direction: number }
        Returns: undefined
      }
      start_circle: {
        Args: { target_group: string; start_date: string; shuffle: boolean }
        Returns: Group
      }
      set_contribution_received: {
        Args: { target_contribution: string; received: boolean }
        Returns: undefined
      }
      complete_current_cycle: {
        Args: { target_group: string }
        Returns: Group
      }
      mock_top_up_wallet: {
        Args: { amount_kobo: number }
        Returns: Profile
      }
      refresh_my_reminders: {
        Args: Record<string, never>
        Returns: undefined
      }
      mock_pay_contribution: {
        Args: { target_contribution: string; pay_method: PaymentMethod }
        Returns: Contribution
      }
    }
  }
}
