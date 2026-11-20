import { useCallback, useEffect, useState } from 'react'
import { FileText, FolderTree } from 'lucide-react'
import { deleteNewsPost, listNewsCategories } from '@/lib/api'
import type { NewsCategory } from '@/types'
import { errorMessage } from '@/features/surveyQuarters/cardEditorParts'
import { NewsCategoriesTab } from './NewsCategoriesTab'
import { NewsConfirmDialog } from './NewsConfirmDialog'
import { NewsPostEditor } from './NewsPostEditor'
import { NewsPostsTab } from './NewsPostsTab'
import './news.css'

type Tab = 'posts' | 'categories'

function NewsTabs({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const tabs: Array<{ icon: typeof FileText; label: string; value: Tab }> = [
    { icon: FileText, label: 'Bài viết', value: 'posts' },
    { icon: FolderTree, label: 'Chuyên mục', value: 'categories' },
  ]
  return (
    <nav aria-label="Mục trong Tin tức" className="survey-module-tabs">
      {tabs.map(({ icon: Icon, label, value }) => (
        <button aria-current={active === value ? 'page' : undefined} className={`survey-module-tab${active === value ? ' is-active' : ''}`} key={value} onClick={() => onChange(value)} type="button">
          <Icon aria-hidden="true" size={16} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

// Dashboard "Tin tức": posts and categories. Admins and super admins write; viewers see the lists.
export function NewsAdminPage({ canEdit }: { canEdit: boolean }) {
  const [tab, setTab] = useState<Tab>('posts')
  const [editing, setEditing] = useState<{ id: string | null } | null>(null)
  const [categories, setCategories] = useState<NewsCategory[]>([])
  const [categoriesError, setCategoriesError] = useState('')
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [notice, setNotice] = useState('')
  const [deleting, setDeleting] = useState<{ done?: () => void; id: string; title: string } | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true)
    setCategoriesError('')
    try {
      setCategories((await listNewsCategories()).items)
    } catch (caught) {
      setCategoriesError(errorMessage(caught, 'Không tải được chuyên mục.'))
    } finally {
      setCategoriesLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  async function confirmDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    setDeleteError('')
    try {
      await deleteNewsPost(deleting.id)
      setNotice(`Đã xóa bài “${deleting.title}”.`)
      deleting.done?.()
      setDeleting(null)
      setReloadKey((value) => value + 1)
      void loadCategories()
    } catch (caught) {
      setDeleteError(errorMessage(caught, 'Không xóa được bài viết.'))
    } finally {
      setDeleteBusy(false)
    }
  }

  const tabs = <NewsTabs active={tab} onChange={(next) => { setTab(next); setEditing(null) }} />
  const deleteDialog = deleting ? (
    <NewsConfirmDialog
      busy={deleteBusy}
      confirmLabel="Xóa bài viết"
      error={deleteError}
      message={`Bài “${deleting.title}” sẽ bị xóa hẳn, link của bài (kể cả link đang chạy quảng cáo) sẽ báo không tìm thấy. Nếu chỉ muốn tạm gỡ khỏi trang web, hãy mở bài và bấm “Ẩn bài”.`}
      onClose={() => setDeleting(null)}
      onConfirm={() => void confirmDelete()}
      title="Xóa bài viết?"
    />
  ) : null

  if (editing && canEdit) {
    return (
      <>
        <NewsPostEditor
          categories={categories}
          key={editing.id ?? 'new'}
          onBack={() => { setEditing(null); setReloadKey((value) => value + 1); void loadCategories() }}
          onDeleted={() => setEditing(null)}
          onRequestDelete={(post, done) => { setDeleteError(''); setDeleting({ ...post, done }) }}
          postId={editing.id}
        />
        {deleteDialog}
      </>
    )
  }

  return (
    <>
      {tab === 'categories' ? (
        <NewsCategoriesTab canEdit={canEdit} categories={categories} error={categoriesError} loading={categoriesLoading} onChanged={loadCategories} onReload={() => void loadCategories()} tabs={tabs} />
      ) : (
        <NewsPostsTab
          canEdit={canEdit}
          categories={categories}
          notice={notice}
          onCreate={() => { setNotice(''); setEditing({ id: null }) }}
          onDelete={(post) => { setDeleteError(''); setDeleting(post) }}
          onDismissNotice={() => setNotice('')}
          onEdit={(id) => { setNotice(''); setEditing({ id }) }}
          reloadKey={reloadKey}
          tabs={tabs}
        />
      )}
      {deleteDialog}
    </>
  )
}
