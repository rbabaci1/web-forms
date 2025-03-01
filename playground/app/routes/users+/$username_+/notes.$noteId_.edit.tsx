import { json, redirect, type DataFunctionArgs } from '@remix-run/node'
import { Form, useActionData, useLoaderData } from '@remix-run/react'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { floatingToolbarClassName } from '#app/components/floating-toolbar.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Label } from '#app/components/ui/label.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { Textarea } from '#app/components/ui/textarea.tsx'
import { db, updateNote } from '#app/utils/db.server.ts'
import { invariantResponse, useIsSubmitting } from '#app/utils/misc.tsx'

export async function loader({ params }: DataFunctionArgs) {
	const note = db.note.findFirst({
		where: {
			id: {
				equals: params.noteId,
			},
		},
	})
	if (!note) {
		throw new Response('Note not found', { status: 404 })
	}
	return json({
		note: { title: note.title, content: note.content },
	})
}

const titleMaxLength = 100
const contentMaxLength = 10000

export async function action({ request, params }: DataFunctionArgs) {
	invariantResponse(params.noteId, 'noteId param is required')

	const formData = await request.formData()
	const title = formData.get('title')
	const content = formData.get('content')
	invariantResponse(typeof title === 'string', 'title must be a string')
	invariantResponse(typeof content === 'string', 'content must be a string')

	const errors = {
		formErrors: [] as Array<string>,
		fieldErrors: {
			title: [] as Array<string>,
			content: [] as Array<string>,
		},
	}

	if (title === '') {
		errors.fieldErrors.title.push('This is required')
	} else if (title.length > titleMaxLength) {
		errors.fieldErrors.title.push(
			`Title must be ${titleMaxLength} charaters or less.`,
		)
	}

	if (content === '') {
		errors.fieldErrors.content.push('This is required')
	} else if (content.length > contentMaxLength) {
		errors.fieldErrors.content.push(
			`Content must be ${contentMaxLength} characters or less.`,
		)
	}

	const hasErrors =
		errors.formErrors.length > 0 ||
		Object.values(errors.fieldErrors).some(
			fieldErrors => fieldErrors.length > 0,
		)

	if (hasErrors) {
		return json(
			{ errors },
			{
				status: 400,
			},
		)
	}

	await updateNote({ id: params.noteId, title, content })

	return redirect(`/users/${params.username}/notes/${params.noteId}`)
}

// 🐨 this is a good place to stick the ErrorList component if you want to use that
function ErrorList({ errors }: { errors?: Array<string> | null }) {
	return errors?.length ? (
		<ul className="flex flex-col gap-1">
			{errors.map((error, index) => (
				<li key={index} className="text-[10px] text-foreground-danger">
					{error}
				</li>
			))}
		</ul>
	) : null
}

export default function NoteEdit() {
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const isSubmitting = useIsSubmitting()
	const formId = 'note-editor'

	const fieldErrors = actionData?.errors.fieldErrors
	const formErrors = actionData?.errors.formErrors

	return (
		<div className="absolute inset-0">
			<Form
				id={formId}
				// 🐨 to test out the server-side validation, you need to disable the
				// client-side validation. You can do that by adding:
				noValidate
				method="post"
				className="flex h-full flex-col gap-y-4 overflow-y-auto overflow-x-hidden px-10 pb-28 pt-12"
			>
				<div className="flex flex-col gap-1">
					<div>
						{/* 🦉 NOTE: this is not an accessible label, we'll get to that in the accessibility exercises */}
						<Label>Title</Label>
						<Input
							name="title"
							defaultValue={data.note.title}
							required
							maxLength={titleMaxLength}
						/>

						<div className="min-h-[32px] px-4 pb-3 pt-1">
							<ErrorList errors={fieldErrors?.title} />
						</div>
					</div>
					<div>
						{/* 🦉 NOTE: this is not an accessible label, we'll get to that in the accessibility exercises */}
						<Label>Content</Label>
						<Textarea
							name="content"
							defaultValue={data.note.content}
							required
							maxLength={contentMaxLength}
						/>

						<div className="min-h-[32px] px-4 pb-3 pt-1">
							<ErrorList errors={fieldErrors?.content} />
						</div>
					</div>
				</div>

				<div className="min-h-[32px] px-4 pb-3 pt-1">
					<ErrorList errors={formErrors} />
				</div>
			</Form>
			<div className={floatingToolbarClassName}>
				<Button variant="destructive" type="reset">
					{/* 🦉 NOTE: this button doesn't work right now, we'll get to that in the accessibility exercise */}
					Reset
				</Button>
				<StatusButton
					form={formId}
					type="submit"
					disabled={isSubmitting}
					status={isSubmitting ? 'pending' : 'idle'}
				>
					Submit
				</StatusButton>
			</div>
		</div>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>No note with the id "{params.noteId}" exists</p>
				),
			}}
		/>
	)
}
