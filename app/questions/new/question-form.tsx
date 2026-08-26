'use client';

import { useState } from 'react';

import { createQuestion } from '@/lib/questions/actions';

import { Button } from '@/components/ui/button';

import { countries } from '@/lib/constants/countries';

export default function QuestionForm() {
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
          何について知りたいですか？
        </label>

        <input
          id="title"
          name="title"
          type="text"
          placeholder="例：インドのローカル校に小学生を通わせた方、どうでしたか？"
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
            国名（その他の場合）
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
          placeholder="知りたいことや現在の状況などを、できるだけ具体的に書いてください。"
          rows={8}
          className="w-full border rounded-lg p-3 bg-background"
          disabled={isSubmitting}
          required
        />
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