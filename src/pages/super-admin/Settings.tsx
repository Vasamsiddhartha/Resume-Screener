import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardHeader, Button, Input, Textarea } from '@/components/ui'
import { Save } from 'lucide-react'

export function SuperAdminSettings() {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      platformName: 'Resume Screener',
      supportEmail: 'support@atsscorer.io',
      maxOrgsPerPlan: '100',
      huggingFaceModel: 'username/ats-scorer-model',
      welcomeMessage: 'Welcome to Resume Screener — the AI-powered resume screening platform.',
    },
  })

  function onSubmit(data: unknown) {
    console.log('Settings saved', data)
  }

  return (
    <div>
      <PageHeader title="Platform Settings" description="Configure global platform settings" />

      <div className="space-y-5 max-w-2xl">
        <Card>
          <CardHeader title="General" description="Basic platform configuration" />
          <div className="space-y-4">
            <Input label="Platform Name" {...register('platformName')} />
            <Input label="Support Email" type="email" {...register('supportEmail')} />
            <Textarea label="Welcome Message" rows={3} {...register('welcomeMessage')} />
          </div>
        </Card>

        <Card>
          <CardHeader title="AI / Model" description="Hugging Face model configuration" />
          <div className="space-y-4">
            <Input
              label="Hugging Face Model Path"
              hint="Format: username/model-name"
              {...register('huggingFaceModel')}
            />
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Set <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">VITE_HF_MODEL_URL</code> and{' '}
                <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">VITE_HF_TOKEN</code> in your .env file to connect the live model.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Limits" description="Platform-wide limits" />
          <div className="space-y-4">
            <Input label="Max Organizations" type="number" {...register('maxOrgsPerPlan')} />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSubmit(onSubmit)} leftIcon={<Save className="w-4 h-4" />}>
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  )
}
