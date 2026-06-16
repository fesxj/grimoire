import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { LuBookOpen, LuMap, LuUser, LuFileQuestion } from 'react-icons/lu'

// We avoid a custom remark tokenizer by rewriting [[...]] tokens into ordinary
// markdown links with a private href scheme, then interpreting that scheme in a
// custom `a` renderer below.
//   [[Page Title]]            -> [Page Title](grimoire-wiki:slug-of-title)
//   [[Page Title|label]]      -> [label](grimoire-wiki:slug-of-title)
//   [[book:ID]] / [[book:ID:PAGE]] / [[map:ID]] / [[token:ID]]
//                             -> [embed](grimoire-embed:book:ID:PAGE)
const LINK_RE = /\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g
const EMBED_PREFIXES = ['book:', 'map:', 'token:']

function slugify(title) {
  return (
    title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_-]+/g, '-') || 'untitled'
  )
}

function escapeLinkText(text) {
  // Keep link text from breaking the markdown link syntax. Escape backslashes
  // first so a user-supplied trailing "\" can't combine with the "]" we add and
  // escape our own closing bracket.
  return text.replace(/\\/g, '\\\\').replace(/\]/g, '\\]')
}

function preprocess(body) {
  return (body || '').replace(LINK_RE, (_match, target, label) => {
    const t = target.trim()
    const lower = t.toLowerCase()
    if (EMBED_PREFIXES.some((p) => lower.startsWith(p))) {
      return `[embed](grimoire-embed:${t})`
    }
    const text = escapeLinkText((label || t).trim())
    return `[${text}](grimoire-wiki:${slugify(t)})`
  })
}

function EmbedCard({ spec, onNavigate }) {
  const { t } = useTranslation()
  const [type, id, page] = spec.split(':')
  const meta = {
    book: { Icon: LuBookOpen, color: '#a78bfa', to: `/library/book/${id}` },
    map: { Icon: LuMap, color: '#60a5fa', to: `/maps/${id}` },
    token: { Icon: LuUser, color: '#34d399', to: `/tokens/${id}` },
  }[type]
  if (!meta) return null
  const { Icon, color } = meta
  const to = type === 'book' && page ? `${meta.to}?page=${page}` : meta.to
  const label =
    type === 'book' && page ? t('wiki.embedBookPage', { page }) : t(`wiki.embed_${type}`)
  return (
    <button
      type="button"
      onClick={() => onNavigate(to)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        margin: '2px 0',
        background: 'var(--bg-deep)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        color: 'var(--text)',
        cursor: 'pointer',
        fontSize: 14,
      }}
    >
      <Icon size={15} color={color} />
      {label}
    </button>
  )
}

export default function WikiMarkdown({ body, pageSlugs = [], onOpenSlug }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const slugSet = useMemo(() => new Set(pageSlugs), [pageSlugs])
  const processed = useMemo(() => preprocess(body), [body])

  const components = useMemo(
    () => ({
      a({ href, children, ...props }) {
        if (href?.startsWith('grimoire-wiki:')) {
          const slug = href.slice('grimoire-wiki:'.length)
          const exists = slugSet.has(slug)
          return (
            <button
              type="button"
              onClick={() => onOpenSlug?.(slug)}
              title={exists ? undefined : t('wiki.missingPageHint')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                font: 'inherit',
                cursor: 'pointer',
                color: exists ? 'var(--gold)' : 'var(--danger)',
                borderBottom: exists
                  ? '1px solid var(--gold-dim, var(--gold))'
                  : '1px dashed var(--danger)',
              }}
            >
              {children}
            </button>
          )
        }
        if (href?.startsWith('grimoire-embed:')) {
          return <EmbedCard spec={href.slice('grimoire-embed:'.length)} onNavigate={navigate} />
        }
        // Ordinary external/internal links.
        const external = href && /^https?:\/\//.test(href)
        return (
          <a
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            style={{ color: 'var(--gold)' }}
            {...props}
          >
            {children}
          </a>
        )
      },
      img({ src, alt }) {
        return (
          <img
            src={src}
            alt={alt || ''}
            style={{ maxWidth: '100%', borderRadius: 8, display: 'block', margin: '8px 0' }}
          />
        )
      },
      table({ children }) {
        return (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', margin: '8px 0' }}>
              {children}
            </table>
          </div>
        )
      },
      th({ children }) {
        return <th style={cellStyle(true)}>{children}</th>
      },
      td({ children }) {
        return <td style={cellStyle(false)}>{children}</td>
      },
      blockquote({ children }) {
        return (
          <blockquote
            style={{
              borderLeft: '3px solid var(--border-light, var(--border))',
              margin: '8px 0',
              padding: '2px 14px',
              color: 'var(--text-dim)',
            }}
          >
            {children}
          </blockquote>
        )
      },
      code({ inline, children }) {
        if (inline) {
          return (
            <code
              style={{
                background: 'var(--bg-deep)',
                borderRadius: 4,
                padding: '1px 5px',
                fontSize: '0.9em',
              }}
            >
              {children}
            </code>
          )
        }
        return (
          <pre
            style={{
              background: 'var(--bg-deep)',
              borderRadius: 8,
              padding: 12,
              overflowX: 'auto',
            }}
          >
            <code>{children}</code>
          </pre>
        )
      },
    }),
    [slugSet, onOpenSlug, navigate, t]
  )

  if (!body?.trim()) {
    return (
      <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 14 }}>
        <LuFileQuestion
          size={14}
          aria-hidden="true"
          style={{ verticalAlign: 'middle', marginRight: 6 }}
        />
        {t('wiki.emptyPage')}
      </div>
    )
  }

  return (
    <div className="wiki-markdown" style={{ fontSize: 15, lineHeight: 1.7 }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        // Preserve our private grimoire-wiki:/grimoire-embed: schemes, which
        // react-markdown's default urlTransform would otherwise strip.
        urlTransform={(url) => url}
      >
        {processed}
      </ReactMarkdown>
    </div>
  )
}

function cellStyle(header) {
  return {
    border: '1px solid var(--border)',
    padding: '6px 10px',
    textAlign: 'left',
    background: header ? 'var(--bg-deep)' : 'transparent',
    fontWeight: header ? 600 : 400,
  }
}
