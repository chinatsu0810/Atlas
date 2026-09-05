'use client';

import { useState } from 'react';

import { createQuestion } from '@/lib/questions/actions';
import TagSelector from '@/components/tag-selector';
import { Button } from '@/components/ui/button';
import { countries } from '@/lib/constants/countries';

type Tag = {
  id: number;
  name: string;
  slug: string;
};

type QuestionFormProps = {
  tags: Tag[];
};

export default function QuestionForm({ tags }: QuestionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');

  return (
    <form
      action={async (formData) => {
        if (isSubmitting) return;

        setIsSubmitting(true);

        try {
          await createQuestion(formData);
        } catch (error) {
          setIsSubmitting(false);
          throw error;
        }
      }}
      className="space-y-6"
    >
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium mb-2"
        >
          質問タイトル
        </label>

        <input
          id="title"
          name="title"
          type="text"
          placeholder="例：デリーで子ども向けの習い事はありますか？"
          className="w-full border rounded-lg p-3 bg-background"
          disabled={isSubmitting}
          required
        />
      </div>

      <div>
        <label
          htmlFor="country"
          className="block text-sm font-medium mb-2"
        >
          国・地域
        </label>

        <select
          id="country"
          name="country"
          defaultValue=""
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="w-full border rounded-lg p-3 bg-background"
          disabled={isSubmitting}
          required
        >
          <option value="" disabled>
            国・地域を選択してください
          </option>

          {countries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </div>

      {selectedCountry === 'その他' && (
        <div>
          <label
            htmlFor="countryFreeText"
            className="block text-sm font-medium mb-2"
          >
            国名・地域名
          </label>

          <input
            id="countryFreeText"
            name="countryFreeText"
            type="text"
            placeholder="例：ジョージア"
            className="w-full border rounded-lg p-3 bg-background"
            disabled={isSubmitting}
            required
          />
        </div>
      )}

      <div>
        <label
          htmlFor="content"
          className="block text-sm font-medium mb-2"
        >
          質問の本文
        </label>

        <textarea
          id="content"
          name="content"
          placeholder="経験者から具体的な回答をもらえるよう、 国・地域や状況をできるだけ詳しく書いてみましょう。"
          rows={8}
          className="w-full border rounded-lg p-3 bg-background"
          disabled={isSubmitting}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          タグ
        </label>

        <TagSelector tags={tags} />
      </div>

      <div>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          {isSubmitting ? '送信中…' : '質問する'}
        </Button>
      </div>
    </form>
  );
}
